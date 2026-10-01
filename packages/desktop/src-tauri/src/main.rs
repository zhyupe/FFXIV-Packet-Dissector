#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod job;
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    io::{BufRead, BufReader, Read, Write},
    path::PathBuf,
    process::{Child, ChildStdin, Command, Stdio},
    sync::{
        atomic::{AtomicBool, AtomicU64, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};
use tauri::{Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tokio::sync::oneshot;

struct BackendState(Result<Arc<Backend>, String>);

struct Backend {
    stdin: Mutex<ChildStdin>,
    child: Mutex<Child>,
    pending: Mutex<HashMap<String, oneshot::Sender<Result<Value, String>>>>,
    next: AtomicU64,
    session: AtomicU64,
    alive: AtomicBool,
    exiting: AtomicBool,
    _job: job::Job,
}

fn validate(action: &str, params: &Value) -> Result<(), String> {
    if !params.is_object() {
        return Err("INVALID_INPUT".into());
    }
    match action {
        "processes" | "snapshot" | "disconnect" | "wizard.start" | "wizard.skip"
        | "wizard.stop" | "wizard.save" => Ok(()),
        "connect"
            if params["pid"]
                .as_u64()
                .is_some_and(|v| v > 0 && v <= u32::MAX as u64)
                && params["startedAt"].as_str().is_some_and(|s| {
                    !s.is_empty() && s.len() <= 20 && s.bytes().all(|b| b.is_ascii_digit())
                }) =>
        {
            Ok(())
        }
        "forwarder" if params["enabled"].is_boolean() => Ok(()),
        "wizard.select"
            if params["name"]
                .as_str()
                .is_some_and(|s| !s.is_empty() && s.len() <= 128) =>
        {
            Ok(())
        }
        "wizard.inputs"
            if params["token"].as_u64().is_some()
                && params["answers"].as_object().is_some_and(|a| {
                    a.len() <= 32
                        && a.iter().all(|(k, v)| {
                            k.len() <= 128
                                && (v.is_number() || v.as_str().is_some_and(|s| s.len() <= 16384))
                        })
                }) =>
        {
            Ok(())
        }
        _ => Err("INVALID_COMMAND".into()),
    }
}

impl Backend {
    async fn call(&self, action: &str, params: Value, session: u64) -> Result<Value, String> {
        if !self.alive.load(Ordering::SeqCst) {
            return Err("BACKEND_EXITED".into());
        }
        let id = self.next.fetch_add(1, Ordering::SeqCst).to_string();
        let (tx, rx) = oneshot::channel();
        self.pending.lock().unwrap().insert(id.clone(), tx);
        let body = json!({"version":1,"id":id,"sessionId":session,"action":action,"params":params});
        let written = writeln!(self.stdin.lock().unwrap(), "{}", body);
        if written.is_err() {
            self.pending.lock().unwrap().remove(&id);
            return Err("BACKEND_WRITE_FAILED".into());
        }
        match tokio::time::timeout(Duration::from_secs(15), rx).await {
            Ok(Ok(result)) => result,
            _ => {
                self.pending.lock().unwrap().remove(&id);
                Err("COMMAND_TIMEOUT".into())
            }
        }
    }
    fn fail(&self, app: &tauri::AppHandle) {
        if !self.alive.swap(false, Ordering::SeqCst) {
            return;
        }
        for (_, sender) in self.pending.lock().unwrap().drain() {
            let _ = sender.send(Err("BACKEND_EXITED".into()));
        }
        let _ = app.emit("backend-exited", ());
        let _ = self.child.lock().unwrap().kill();
    }
}

fn runtime(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let bundled = app
        .path()
        .resource_dir()
        .map_err(|_| "RESOURCE_PATH_FAILED")?
        .join("runtime");
    if bundled.join("node.exe").is_file() {
        return Ok(bundled);
    }
    #[cfg(debug_assertions)]
    {
        return Ok(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("resources"));
    }
    #[cfg(not(debug_assertions))]
    Err("RUNTIME_NOT_FOUND".into())
}

fn launch(app: &tauri::AppHandle) -> Result<Arc<Backend>, String> {
    let root = runtime(app)?;
    let data = app.path().app_data_dir().map_err(|_| "DATA_PATH_FAILED")?;
    std::fs::create_dir_all(&data).map_err(|_| "DATA_PATH_FAILED")?;
    let mut command = Command::new(root.join("node.exe"));
    command
        .arg(root.join("service.mjs"))
        .arg(&root)
        .arg(data)
        .current_dir(&root)
        .env_remove("NODE_OPTIONS")
        .env_remove("NODE_PATH")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    let mut child = command.spawn().map_err(|_| "BACKEND_START_FAILED")?;
    let job = match job::Job::attach(&child) {
        Ok(job) => job,
        Err(_) => {
            let _ = child.kill();
            let _ = child.wait();
            return Err("BACKEND_JOB_FAILED".into());
        }
    };
    let output = child.stdout.take().ok_or("BACKEND_PIPE_FAILED")?;
    let stdin = child.stdin.take().ok_or("BACKEND_PIPE_FAILED")?;
    let backend = Arc::new(Backend {
        stdin: Mutex::new(stdin),
        child: Mutex::new(child),
        pending: Mutex::new(HashMap::new()),
        next: AtomicU64::new(1),
        session: AtomicU64::new(0),
        alive: AtomicBool::new(true),
        exiting: AtomicBool::new(false),
        _job: job,
    });
    let state = backend.clone();
    let app = app.clone();
    std::thread::spawn(move || {
        let mut reader = BufReader::new(output);
        loop {
            let mut line = Vec::new();
            // Bound a corrupted or runaway service response without retaining raw logs.
            let read = std::io::Read::by_ref(&mut reader)
                .take(1024 * 1024)
                .read_until(b'\n', &mut line);
            if !matches!(read, Ok(n) if n > 0) || line.len() >= 1024 * 1024 {
                break;
            }
            let Ok(message) = serde_json::from_slice::<Value>(&line) else {
                break;
            };
            if message["version"] != 1 {
                break;
            }
            if let Some(session) = message["sessionId"].as_u64() {
                state.session.store(session, Ordering::SeqCst);
            }
            match message["type"].as_str() {
                Some("state") => {
                    let _ = app.emit("service-state", &message["snapshot"]);
                }
                Some("response") => {
                    if let Some(id) = message["id"].as_str() {
                        if let Some(sender) = state.pending.lock().unwrap().remove(id) {
                            let result = if message["ok"] == true {
                                Ok(message["result"].clone())
                            } else {
                                Err(message["error"]
                                    .as_str()
                                    .unwrap_or("COMMAND_FAILED")
                                    .to_string())
                            };
                            let _ = sender.send(result);
                        }
                    }
                }
                _ => break,
            }
        }
        state.fail(&app);
    });
    Ok(backend)
}

#[tauri::command]
async fn service_request(
    action: String,
    params: Value,
    session_id: u64,
    backend: State<'_, BackendState>,
) -> Result<Value, String> {
    let backend = backend.0.as_ref().map_err(Clone::clone)?;
    validate(&action, &params)?;
    backend.call(&action, params, session_id).await
}

#[tauri::command]
async fn export_results(
    app: tauri::AppHandle,
    session_id: u64,
    backend: State<'_, BackendState>,
) -> Result<bool, String> {
    let backend = backend.0.as_ref().map_err(Clone::clone)?;
    let result = backend.call("wizard.export", json!({}), session_id).await?;
    let path = tauri::async_runtime::spawn_blocking(move || {
        app.dialog()
            .file()
            .set_file_name("opcode.json")
            .add_filter("JSON", &["json"])
            .blocking_save_file()
    })
    .await
    .map_err(|_| "DIALOG_FAILED")?;
    let Some(path) = path else {
        return Ok(false);
    };
    let path = path.into_path().map_err(|_| "EXPORT_PATH_FAILED")?;
    let text = serde_json::to_vec_pretty(&result).map_err(|_| "EXPORT_FAILED")?;
    std::fs::write(path, text).map_err(|_| "EXPORT_FAILED")?;
    Ok(true)
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![service_request, export_results])
        .setup(|app| {
            app.manage(BackendState(launch(app.handle())));
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<BackendState>();
                let Ok(backend) = &state.0 else {
                    return;
                };
                let backend = backend.clone();
                if backend.exiting.swap(true, Ordering::SeqCst) {
                    api.prevent_close();
                    return;
                }
                api.prevent_close();
                let app = window.app_handle().clone();
                tauri::async_runtime::spawn(async move {
                    let shutdown = backend.call(
                        "shutdown",
                        json!({}),
                        backend.session.load(Ordering::SeqCst),
                    );
                    let result = tokio::time::timeout(Duration::from_secs(5), shutdown).await;
                    if matches!(result, Ok(Err(ref error)) if error == "SAVE_FAILED") {
                        backend.exiting.store(false, Ordering::SeqCst);
                        let _ = app.emit("service-error", "SAVE_FAILED");
                        return;
                    }
                    let mut child = backend.child.lock().unwrap();
                    let _ = child.kill();
                    let _ = child.wait();
                    app.exit(0);
                });
            }
        })
        .run(tauri::generate_context!())
        .expect("Desktop startup failed");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn command_boundary() {
        assert!(validate("connect", &json!({"pid":123,"startedAt":"456"})).is_ok());
        assert!(validate("connect", &json!({"pid":-1,"startedAt":"456"})).is_err());
        assert!(validate("shell", &json!({})).is_err());
        assert!(validate("wizard.inputs", &json!({"token":1,"answers":{"x":"test"}})).is_ok());
        assert!(validate("wizard.inputs", &json!({"token":1,"answers":{"x":{}}})).is_err());
    }
}
