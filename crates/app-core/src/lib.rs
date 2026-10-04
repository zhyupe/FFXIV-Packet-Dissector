mod router;
pub mod storage;
use ffxiv_capture_core::{Cancellation, Capture};
use ffxiv_capture_output::{Output, OutputWriter};
use ffxiv_protocol::*;
use ffxiv_wizard_engine::Engine;
use router::Routed as Event;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    collections::VecDeque,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};
use tokio::sync::{mpsc, oneshot, watch};
struct Command {
    action: String,
    params: Value,
    session: u32,
    reply: oneshot::Sender<Result<Value>>,
}
#[derive(Clone)]
pub struct App {
    tx: mpsc::Sender<Command>,
    pub snapshots: watch::Receiver<Snapshot>,
    cancel: Arc<Mutex<Option<Cancellation>>>,
}
impl App {
    pub fn start(
        manifest: Manifest,
        data_dir: PathBuf,
        dll: PathBuf,
    ) -> Result<(Self, mpsc::Receiver<Vec<u8>>)> {
        // The rule catalog is available before capture or progress storage starts.
        let catalog = Engine::new(manifest.clone())?.snapshot();
        let state = Snapshot {
            session_id: 0,
            connection: "disconnected".into(),
            target: None,
            forwarder: OutputStatus::default(),
            wizard: Some(catalog.clone()),
            error: String::new(),
        };
        let (tx, rx) = mpsc::channel(32);
        let (publish, snapshots) = watch::channel(state.clone());
        let (worker, worker_rx) = mpsc::channel(1);
        let cancel = Arc::new(Mutex::new(None));
        let core = Core {
            manifest,
            catalog,
            data_dir,
            dll,
            state,
            publish,
            worker,
            wizard: None,
            store: None,
            output: None,
            capture: None,
            capture_rx: None,
            router: None,
            observing: Arc::new(AtomicBool::new(false)),
            latest_sequence: Arc::new(AtomicU64::new(0)),
            window_floor: 0,
            output_writer: Arc::new(Mutex::new(None)),
            overflow: Arc::new(AtomicBool::new(false)),
            cancel: cancel.clone(),
            buffered: VecDeque::new(),
            buffered_bytes: 0,
        };
        tokio::spawn(core.run(rx));
        Ok((
            Self {
                tx,
                snapshots,
                cancel,
            },
            worker_rx,
        ))
    }
    pub async fn request(&self, action: &str, params: Value, session: u32) -> Result<Value> {
        if matches!(action, "disconnect" | "shutdown")
            && session == self.snapshots.borrow().session_id
        {
            if let Some(c) = &*self.cancel.lock().unwrap() {
                c.cancel();
            }
        }
        let (reply, rx) = oneshot::channel();
        tokio::time::timeout(
            Duration::from_secs(5),
            self.tx.send(Command {
                action: action.into(),
                params,
                session,
                reply,
            }),
        )
        .await
        .map_err(|_| "COMMAND_TIMEOUT")?
        .map_err(|_| "SERVICE_CLOSED")?;
        tokio::time::timeout(Duration::from_secs(15), rx)
            .await
            .map_err(|_| "COMMAND_TIMEOUT")?
            .map_err(|_| "SERVICE_CLOSED")?
    }
}
struct Core {
    manifest: Manifest,
    catalog: WizardSnapshot,
    data_dir: PathBuf,
    dll: PathBuf,
    state: Snapshot,
    publish: watch::Sender<Snapshot>,
    worker: mpsc::Sender<Vec<u8>>,
    wizard: Option<Engine>,
    store: Option<Arc<storage::Store>>,
    output: Option<Output>,
    capture: Option<Capture>,
    capture_rx: Option<mpsc::Receiver<Event>>,
    cancel: Arc<Mutex<Option<Cancellation>>>,
    router: Option<tokio::task::JoinHandle<()>>,
    observing: Arc<AtomicBool>,
    latest_sequence: Arc<AtomicU64>,
    window_floor: u64,
    output_writer: Arc<Mutex<Option<OutputWriter>>>,
    overflow: Arc<AtomicBool>,
    buffered: VecDeque<Packet>,
    buffered_bytes: usize,
}
impl Core {
    fn publish(&mut self) {
        self.observing.store(
            self.wizard.as_ref().is_some_and(Engine::is_running),
            Ordering::Release,
        );
        self.state.wizard = Some(
            self.wizard
                .as_ref()
                .map_or_else(|| self.catalog.clone(), Engine::snapshot),
        );
        if let Some(o) = &self.output {
            self.state.forwarder = o.status.lock().unwrap().clone();
        }
        self.publish.send_replace(self.state.clone());
    }
    fn check_overflow(&mut self) {
        if self.overflow.swap(false, Ordering::AcqRel) {
            if let Some(w) = &mut self.wizard {
                if w.is_running() {
                    w.fail("WIZARD_OVERFLOW");
                }
            }
            self.clear_buffer();
        }
    }
    fn new_window(&mut self) {
        self.clear_buffer();
        self.window_floor = self.latest_sequence.load(Ordering::Acquire);
        self.overflow.store(false, Ordering::Release);
    }
    fn clear_buffer(&mut self) {
        self.buffered.clear();
        self.buffered_bytes = 0;
    }
    async fn save(&mut self) -> Result<()> {
        if let (Some(w), Some(store)) = (&mut self.wizard, &self.store) {
            let store = store.clone();
            let value = w.persistent();
            if let Err(e) = tokio::task::spawn_blocking(move || store.save(&value))
                .await
                .map_err(|_| "SAVE_FAILED")?
            {
                w.fail("SAVE_FAILED");
                return Err(e);
            }
            w.saved();
        }
        Ok(())
    }
    async fn disconnect(&mut self) -> Result<()> {
        if let Some(w) = &mut self.wizard {
            w.stop(true);
        }
        self.observing.store(false, Ordering::Release);
        let saved = self.save().await;
        *self.output_writer.lock().unwrap() = None;
        self.clear_buffer();
        if let Some(o) = self.output.take() {
            let status = o.status.clone();
            o.stop().await;
            self.state.forwarder = status.lock().unwrap().clone();
        }
        if let Some(c) = self.capture.take() {
            c.stop().await;
        }
        if let Some(router) = self.router.take() {
            router.abort();
            let _ = router.await;
        }
        self.capture_rx = None;
        self.latest_sequence.store(0, Ordering::Release);
        self.window_floor = 0;
        self.overflow.store(false, Ordering::Release);
        *self.cancel.lock().unwrap() = None;
        self.state.connection = "disconnected".into();
        if saved.is_err() {
            self.state.error = "SAVE_FAILED".into();
        }
        saved
    }
    async fn dispatch(&mut self, command: &Command) -> Result<Value> {
        let p = &command.params;
        if command.action == "snapshot" {
            self.publish();
            return Ok(json!(self.state));
        }
        if command.action == "processes" {
            return Ok(json!(tokio::task::spawn_blocking(ffxiv_game_process::list)
                .await
                .map_err(|_| "PROCESS_QUERY_FAILED")??));
        }
        if command.session != self.state.session_id {
            return Err("STALE_SESSION".into());
        }
        match command.action.as_str() {
            "connect" => {
                let target: Target =
                    serde_json::from_value(p.clone()).map_err(|_| "INVALID_TARGET")?;
                if target.pid == 0 || target.started_at.parse::<u64>().is_err() {
                    return Err("INVALID_TARGET".into());
                }
                self.disconnect().await?;
                self.store = None;
                self.wizard = None;
                self.state.wizard = Some(self.catalog.clone());
                self.state.target = None;
                self.state.session_id = self
                    .state
                    .session_id
                    .checked_add(1)
                    .ok_or("SESSION_LIMIT")?;
                self.state.error.clear();
                self.state.connection = "connecting".into();
                let (capture, rx) = Capture::start(target, self.dll.clone());
                *self.cancel.lock().unwrap() = Some(capture.cancel.clone());
                self.capture = Some(capture);
                let (task, rx) = router::start(
                    rx,
                    self.output_writer.clone(),
                    self.overflow.clone(),
                    self.observing.clone(),
                    self.latest_sequence.clone(),
                );
                self.router = Some(task);
                self.capture_rx = Some(rx);
            }
            "disconnect" | "shutdown" => {
                self.disconnect().await?;
            }
            "wizard.export" => return Ok(self.wizard.as_ref().ok_or("NOT_CONNECTED")?.export()),
            "wizard.save" => {
                if self.store.is_none() {
                    return Err("STATE_UNAVAILABLE".into());
                }
                self.save().await?;
                self.state.error.clear();
            }
            "worker.result" => {
                self.check_overflow();
                let result: WorkerResult =
                    serde_json::from_value(p.clone()).map_err(|_| "INVALID_WORKER_RESULT")?;
                if let Some(w) = &mut self.wizard {
                    let token = w.token();
                    if !w.accept(result) {
                        return Ok(Value::Null);
                    }
                    if w.token() != token && !w.continuation() {
                        self.new_window();
                    }
                }
                self.save_if_dirty().await;
                self.drain().await;
            }
            "worker.failed" => {
                if let Some(w) = &mut self.wizard {
                    if w.busy() && p["token"].as_u64().is_none_or(|t| t == w.token() as u64) {
                        w.fail("WORKER_FAILED");
                    }
                }
                self.clear_buffer();
            }
            "forwarder" => {
                if self.state.connection != "connected" {
                    return Err("NOT_CONNECTED".into());
                }
                let enabled = p["enabled"].as_bool().ok_or("INVALID_INPUT")?;
                if enabled && !matches!(p["mode"].as_str().unwrap_or("pipe"), "pipe" | "udp") {
                    return Err("INVALID_INPUT".into());
                }
                *self.output_writer.lock().unwrap() = None;
                if let Some(o) = self.output.take() {
                    let s = o.status.clone();
                    o.stop().await;
                    self.state.forwarder = s.lock().unwrap().clone();
                }
                if enabled {
                    self.output = Some(match p["mode"].as_str().unwrap_or("pipe") {
                        "udp" => Output::udp().await?,
                        "pipe" => ffxiv_capture_output::named_pipe(format!(
                            r"\\.\pipe\ffxiv-dissector-{}-{}",
                            std::process::id(),
                            self.state.session_id
                        ))?,
                        _ => return Err("INVALID_INPUT".into()),
                    });
                }
                *self.output_writer.lock().unwrap() = self.output.as_ref().map(Output::writer);
            }
            action => {
                if self.state.connection != "connected" {
                    return Err("NOT_CONNECTED".into());
                }
                if self.store.is_none() {
                    return Err("STATE_UNAVAILABLE".into());
                }
                self.new_window();
                let w = self.wizard.as_mut().ok_or("NOT_CONNECTED")?;
                match action {
                    "wizard.start" => w.start(None)?,
                    "wizard.select" => w.start(Some(p["name"].as_str().ok_or("INVALID_STEP")?))?,
                    "wizard.inputs" => w.inputs(
                        u32::try_from(p["token"].as_u64().ok_or("INVALID_INPUT")?)
                            .map_err(|_| "INVALID_INPUT")?,
                        serde_json::from_value(p["answers"].clone())
                            .map_err(|_| "INVALID_INPUT")?,
                    )?,
                    "wizard.skip" => w.skip(),
                    "wizard.stop" => w.stop(false),
                    _ => return Err("INVALID_COMMAND".into()),
                }
                self.save_if_dirty().await;
            }
        }
        self.publish();
        Ok(json!(self.state))
    }
    async fn save_if_dirty(&mut self) {
        if self.wizard.as_ref().is_some_and(|w| w.unsaved) {
            let _ = self.save().await;
        }
    }
    async fn feed(&mut self, packet: Packet) {
        self.check_overflow();
        if packet.sequence <= self.window_floor {
            return;
        }
        let Some(w) = &mut self.wizard else {
            return;
        };
        if !w.is_running() {
            return;
        }
        if w.busy() {
            if self.buffered.len() >= 256
                || self.buffered_bytes + packet.body.len() > 4 * 1024 * 1024
            {
                w.fail("WIZARD_OVERFLOW");
                self.clear_buffer();
                return;
            }
            self.buffered_bytes += packet.body.len();
            self.buffered.push_back(packet);
            return;
        }
        let token = w.token();
        if let Some(task) = w.observe(&packet, self.state.session_id) {
            let metadata = serde_json::to_vec(&task).unwrap();
            let mut bytes = Vec::with_capacity(metadata.len() + packet.body.len() + 4);
            bytes.extend((metadata.len() as u32).to_le_bytes());
            bytes.extend(metadata);
            bytes.extend(&packet.body);
            if self.worker.try_send(bytes).is_err() {
                w.fail("WORKER_UNAVAILABLE");
            }
        }
        if w.token() != token && !w.continuation() {
            self.new_window();
        }
        self.save_if_dirty().await;
    }
    async fn drain(&mut self) {
        while self
            .wizard
            .as_ref()
            .is_some_and(|w| !w.busy() && w.is_running())
        {
            let Some(p) = self.buffered.pop_front() else {
                break;
            };
            self.buffered_bytes -= p.body.len();
            self.feed(p).await;
        }
        if self.wizard.as_ref().is_some_and(|w| !w.is_running()) {
            self.clear_buffer();
        }
    }
    async fn event(&mut self, event: Event) {
        match event {
            Event::Connected(process) => {
                let key = format!(
                    "{:x}",
                    Sha256::digest(format!(
                        "{}\0{}\0{}",
                        process.executable.to_lowercase(),
                        process.version,
                        self.manifest.hash
                    ))
                );
                let manifest = self.manifest.clone();
                let path = self.data_dir.join("wizard").join(key).join("state.json");
                let known_version = process.version != "unknown";
                let setup =
                    tokio::task::spawn_blocking(move || -> Result<(Engine, storage::Store)> {
                        if !known_version {
                            return Err("BUILD_VERSION_UNKNOWN".into());
                        }
                        let mut w = Engine::new(manifest)?;
                        let store = storage::Store::open(path)?;
                        if let Some(value) = store.read()? {
                            w.restore(value)?;
                        }
                        Ok((w, store))
                    })
                    .await
                    .unwrap_or_else(|_| Err("STATE_READ_FAILED".into()));

                match setup {
                    Ok((w, store)) => {
                        self.wizard = Some(w);
                        self.store = Some(Arc::new(store));
                        self.state.target = Some(process);
                        self.state.connection = "connected".into();
                    }
                    Err(e) => {
                        // Progress storage is a wizard concern; capture output remains available.
                        let mut w = Engine::new(self.manifest.clone()).expect("validated manifest");
                        w.fail(&e);
                        self.wizard = Some(w);
                        self.store = None;
                        self.state.target = Some(process);
                        self.state.connection = "connected".into();
                    }
                }
            }
            Event::Packet(captured) => {
                if self.state.connection == "connected" {
                    self.feed(captured.packet).await;
                }
            }
            Event::Closed(e) => {
                let _ = self.disconnect().await;
                if !e.is_empty() {
                    self.state.connection = "failed".into();
                    self.state.error = e;
                }
            }
        }
    }
    async fn run(mut self, mut commands: mpsc::Receiver<Command>) {
        let mut tick = tokio::time::interval(Duration::from_millis(200));
        loop {
            tokio::select! {
                command = commands.recv() => {
                    let Some(command) = command else { break; };
                    let stop = command.action == "shutdown";
                    if command.reply.is_closed() { continue; }
                    let result = self.dispatch(&command).await; let done = stop && result.is_ok(); self.publish(); let _ = command.reply.send(result); if done { break; }
                },
                event = async { match &mut self.capture_rx { Some(rx) => rx.recv().await, None => std::future::pending().await } } => {
                    match event { Some(event) => self.event(event).await, None => { self.event(Event::Closed("PIPE_CLOSED".into())).await; } }
                },
                _ = tick.tick() => { self.check_overflow(); if let Some(w) = &mut self.wizard { w.check_timeout(); } self.drain().await; self.publish(); },
            }
        }
        let _ = self.disconnect().await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn synthetic_manifest() -> Manifest {
        serde_json::from_value(json!({"version":1,"hash":"a".repeat(64),"steps":[{"name":"Synthetic","instruction":"Synthetic operation","source":"S","category":"ServerZoneIpc","channel":1,"fields":[],"length":{"min":4,"max":4,"oneOf":[4]},"probe":null}]})).unwrap()
    }
    #[tokio::test]
    async fn bundled_catalog_is_available_without_a_game() {
        let manifest: Manifest = serde_json::from_str(include_str!(
            "../../../packages/wizard/generated/manifest.json"
        ))
        .unwrap();
        let expected = serde_json::to_value(&manifest.steps).unwrap();
        let (app, _worker) = App::start(
            manifest,
            std::env::temp_dir().join("unused-bundled-catalog-profile"),
            PathBuf::new(),
        )
        .unwrap();
        assert!(!app
            .snapshots
            .borrow()
            .wizard
            .as_ref()
            .unwrap()
            .steps
            .is_empty());
        let snapshot = app.request("snapshot", json!({}), 0).await.unwrap();
        assert_eq!(snapshot["wizard"]["steps"], expected);
        assert_eq!(snapshot["connection"], "disconnected");
        assert!(snapshot["target"].is_null());
        assert_eq!(
            app.request("wizard.select", json!({"name": expected[0]["name"]}), 0)
                .await
                .unwrap_err(),
            "NOT_CONNECTED"
        );
        app.request("shutdown", json!({}), 0).await.unwrap();
    }
    #[tokio::test]
    async fn session_validation_and_shutdown_are_serialized() {
        let (app, _worker) = App::start(
            synthetic_manifest(),
            std::env::temp_dir().join("unused-synthetic-profile"),
            PathBuf::new(),
        )
        .unwrap();
        assert_eq!(
            app.request("disconnect", json!({}), 1).await.unwrap_err(),
            "STALE_SESSION"
        );
        let snapshot = app.request("snapshot", json!({}), 0).await.unwrap();
        assert_eq!(snapshot["connection"], "disconnected");
        assert_eq!(snapshot["wizard"]["steps"][0]["name"], "Synthetic");
        assert_eq!(snapshot["wizard"]["status"], "idle");
        assert_eq!(snapshot["wizard"]["results"], json!([]));
        assert_eq!(
            app.request("wizard.start", json!({}), 0).await.unwrap_err(),
            "NOT_CONNECTED"
        );
        assert_eq!(
            app.request("wizard.save", json!({}), 0).await.unwrap_err(),
            "STATE_UNAVAILABLE"
        );
        app.request("shutdown", json!({}), 0).await.unwrap();
    }
    #[tokio::test]
    async fn failed_save_preserves_in_memory_results_and_can_retry() {
        let dir = std::env::temp_dir().join(format!("ffxiv-save-failure-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("state.json");
        let store = storage::Store::open(path.clone()).unwrap();
        std::fs::create_dir(&path).unwrap();
        let mut w = Engine::new(synthetic_manifest()).unwrap();
        w.start(None).unwrap();
        assert!(store.save(&w.persistent()).is_err());
        w.fail("SAVE_FAILED");
        assert!(w.unsaved);
        std::fs::remove_dir(&path).unwrap();
        store.save(&w.persistent()).unwrap();
        w.saved();
        assert!(!w.unsaved);
        assert_eq!(w.snapshot().status, "stopped");
        drop(store);
        std::fs::remove_dir_all(dir).unwrap();
    }
}
