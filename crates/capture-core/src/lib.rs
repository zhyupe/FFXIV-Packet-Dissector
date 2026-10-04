use ffxiv_protocol::{GameProcess, Packet, Target};
use std::path::PathBuf;
#[cfg(windows)]
use std::sync::Arc;
#[cfg(windows)]
use tokio::sync::Semaphore;
use tokio::sync::{mpsc, watch, OwnedSemaphorePermit};
#[derive(Clone)]
pub struct Cancellation(watch::Sender<bool>);
impl Default for Cancellation {
    fn default() -> Self {
        Self(watch::channel(false).0)
    }
}
impl Cancellation {
    pub fn cancel(&self) {
        self.0.send_replace(true);
    }
    pub async fn cancelled(&self) {
        let mut rx = self.0.subscribe();
        let _ = rx.wait_for(|v| *v).await;
    }
}
pub struct Captured {
    pub packet: Packet,
    _permit: OwnedSemaphorePermit,
}
impl Captured {
    pub fn with_budget(
        packet: Packet,
        memory: &std::sync::Arc<tokio::sync::Semaphore>,
    ) -> Option<Self> {
        let permit = memory
            .clone()
            .try_acquire_many_owned((packet.body.len() + 64) as u32)
            .ok()?;
        Some(Self {
            packet,
            _permit: permit,
        })
    }
}
pub enum Event {
    Connected(GameProcess),
    Packet(Captured),
    Closed(String),
}
pub struct Capture {
    pub cancel: Cancellation,
    task: tokio::task::JoinHandle<()>,
}
impl Capture {
    pub fn start(target: Target, dll: PathBuf) -> (Self, mpsc::Receiver<Event>) {
        let (tx, rx) = mpsc::channel(256);
        let cancel = Cancellation::default();
        let stop = cancel.clone();
        let task = tokio::spawn(async move {
            let result = tokio::select! { _ = stop.cancelled() => Ok(()), result = run(target, dll, tx.clone()) => result };
            let _ = tx.try_send(Event::Closed(result.err().unwrap_or_default()));
        });
        (Self { cancel, task }, rx)
    }
    pub async fn stop(self) {
        self.cancel.cancel();
        let _ = self.task.await;
    }
}
#[cfg(windows)]
async fn run(target: Target, dll: PathBuf, tx: mpsc::Sender<Event>) -> ffxiv_protocol::Result<()> {
    use std::time::Duration;
    let query = target.clone();
    let process = tokio::task::spawn_blocking(move || ffxiv_game_process::inspect(&query))
        .await
        .map_err(|_| "PROCESS_QUERY_FAILED")??;
    let mut connection = match ffxiv_deucalion_client::open(target.pid).await {
        Ok(c) => c,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            let t = target.clone();
            tokio::task::spawn_blocking(move || ffxiv_game_process::inject(&t, &dll))
                .await
                .map_err(|_| "INJECTION_FAILED")??;
            tokio::time::timeout(Duration::from_secs(10), async {
                loop {
                    match ffxiv_deucalion_client::open(target.pid).await {
                        Ok(c) => break Ok(c),
                        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                            tokio::time::sleep(Duration::from_millis(100)).await
                        }
                        Err(_) => break Err("PIPE_CONNECT_FAILED"),
                    }
                }
            })
            .await
            .map_err(|_| "PIPE_TIMEOUT")??
        }
        Err(_) => return Err("PIPE_CONNECT_FAILED".into()),
    };
    // An existing pipe does not waive process identity verification.
    let t = target.clone();
    tokio::task::spawn_blocking(move || ffxiv_game_process::inspect(&t))
        .await
        .map_err(|_| "PROCESS_QUERY_FAILED")??;
    tokio::time::timeout(Duration::from_secs(5), connection.handshake())
        .await
        .map_err(|_| "HANDSHAKE_TIMEOUT")?
        .map_err(|_| "HANDSHAKE_FAILED")?;
    tx.send(Event::Connected(process))
        .await
        .map_err(|_| "SESSION_CLOSED")?;
    let memory = Arc::new(Semaphore::new(32 * 1024 * 1024));
    let mut sequence = 0;
    loop {
        let frame = connection.receive().await.map_err(|_| "PIPE_CLOSED")?;
        if frame.op == 1 {
            connection
                .send(1, frame.channel, &frame.data)
                .await
                .map_err(|_| "PIPE_CLOSED")?;
            continue;
        }
        sequence += 1;
        if let Some(packet) = frame.into_packet(sequence).map_err(|_| "INVALID_FRAME")? {
            let permit = memory
                .clone()
                .try_acquire_many_owned((packet.body.len() + 64) as u32)
                .map_err(|_| "CAPTURE_OVERFLOW")?;
            // Never silently lose packets before the independently bounded consumers.
            tx.try_send(Event::Packet(Captured {
                packet,
                _permit: permit,
            }))
            .map_err(|_| "CAPTURE_OVERFLOW")?;
        }
    }
}
#[cfg(not(windows))]
async fn run(_: Target, _: PathBuf, _: mpsc::Sender<Event>) -> ffxiv_protocol::Result<()> {
    Err("WINDOWS_REQUIRED".into())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn cancellation_is_sticky_and_idempotent() {
        let c = Cancellation::default();
        c.cancel();
        c.cancel();
        tokio::time::timeout(std::time::Duration::from_millis(50), c.cancelled())
            .await
            .unwrap();
    }
}
