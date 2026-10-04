use ffxiv_protocol::{OutputStatus, Packet};
use std::{
    sync::{Arc, Mutex},
    time::Duration,
};
use tokio::{
    io::{AsyncWrite, AsyncWriteExt},
    sync::{mpsc, watch, OwnedSemaphorePermit, Semaphore},
};
fn block(kind: u32, mut data: Vec<u8>) -> Vec<u8> {
    while data.len() % 4 != 0 {
        data.push(0);
    }
    let size = (data.len() + 12) as u32;
    let mut out = Vec::with_capacity(size as usize);
    out.extend(kind.to_le_bytes());
    out.extend(size.to_le_bytes());
    out.extend(data);
    out.extend(size.to_le_bytes());
    out
}
pub fn preamble() -> Vec<u8> {
    let mut shb = vec![];
    shb.extend(0x1a2b3c4du32.to_le_bytes());
    shb.extend(1u16.to_le_bytes());
    shb.extend(0u16.to_le_bytes());
    shb.extend(u64::MAX.to_le_bytes());
    let mut out = block(0x0a0d0d0a, shb);
    let mut idb = vec![];
    idb.extend(252u16.to_le_bytes());
    idb.extend(0u16.to_le_bytes());
    idb.extend(0u32.to_le_bytes());
    // if_tsresol: decimal milliseconds, exactly the source clock precision.
    idb.extend([9, 0, 1, 0, 3, 0, 0, 0, 0, 0, 0, 0]);
    out.extend(block(1, idb));
    out
}
pub fn packet_block(p: &Packet) -> Vec<u8> {
    let mut data = vec![];
    let name = b"ffxiv_deucalion";
    data.extend(12u16.to_be_bytes());
    data.extend(16u16.to_be_bytes());
    data.extend(name);
    data.resize(20, 0);
    data.extend([0; 4]);
    // Custom header: version u16, direction u8, reserved u8, channel u32,
    // source/target actor u32, then the original IPC header and body.
    data.extend(1u16.to_le_bytes());
    data.push(if p.source == "S" { 1 } else { 0 });
    data.push(0);
    data.extend(p.channel.to_le_bytes());
    data.extend(p.source_actor.to_le_bytes());
    data.extend(p.target_actor.to_le_bytes());
    data.extend(p.ipc);
    data.extend(&p.body);
    let mut epb = vec![];
    epb.extend(0u32.to_le_bytes());
    epb.extend(((p.timestamp_ms >> 32) as u32).to_le_bytes());
    epb.extend((p.timestamp_ms as u32).to_le_bytes());
    epb.extend((data.len() as u32).to_le_bytes());
    epb.extend((data.len() as u32).to_le_bytes());
    epb.extend(data);
    block(6, epb)
}
pub fn udp_packet(p: &Packet) -> Option<Vec<u8>> {
    if p.channel != 1 || p.body.len() + 72 > 65507 {
        return None;
    }
    let mut b = vec![0; 72];
    b[..16].copy_from_slice(&[
        0x52, 0x52, 0xa0, 0x41, 0xff, 0x5d, 0x46, 0xe2, 0x7f, 0x2a, 0x64, 0x4d, 0x7b, 0x99, 0xc4,
        0x75,
    ]);
    b[16..24].copy_from_slice(&p.timestamp_ms.to_le_bytes());
    b[24..28].copy_from_slice(&((72 + p.body.len()) as u32).to_le_bytes());
    b[40..44].copy_from_slice(&((32 + p.body.len()) as u32).to_le_bytes());
    b[44..48].copy_from_slice(&p.source_actor.to_le_bytes());
    b[48..52].copy_from_slice(&p.target_actor.to_le_bytes());
    b[52..54].copy_from_slice(&3u16.to_le_bytes());
    b[56..72].copy_from_slice(&p.ipc);
    b.extend(&p.body);
    Some(b)
}
struct Queued {
    packet: Packet,
    _permit: OwnedSemaphorePermit,
}
pub struct Output {
    tx: mpsc::Sender<Queued>,
    memory: Arc<Semaphore>,
    stop: watch::Sender<bool>,
    task: tokio::task::JoinHandle<()>,
    pub status: Arc<Mutex<OutputStatus>>,
}
impl Output {
    fn create(mode: &str, pipe: String) -> (Self, mpsc::Receiver<Queued>, watch::Receiver<bool>) {
        let (tx, rx) = mpsc::channel(1024);
        let (stop, cancel) = watch::channel(false);
        let status = Arc::new(Mutex::new(OutputStatus {
            running: true,
            mode: mode.into(),
            pipe,
            ..Default::default()
        }));
        (
            Self {
                tx,
                memory: Arc::new(Semaphore::new(32 * 1024 * 1024)),
                stop,
                task: tokio::spawn(async {}),
                status,
            },
            rx,
            cancel,
        )
    }
    pub fn writer(&self) -> OutputWriter {
        OutputWriter {
            tx: self.tx.clone(),
            memory: self.memory.clone(),
            status: self.status.clone(),
        }
    }
    pub fn write(&self, packet: &Packet) {
        self.writer().write(packet);
    }
    pub fn stream<F, W>(pipe: String, open: F) -> Self
    where
        F: std::future::Future<Output = std::io::Result<W>> + Send + 'static,
        W: AsyncWrite + Unpin + Send + 'static,
    {
        let (mut output, mut rx, mut stop) = Self::create("pipe", pipe);
        let status = output.status.clone();
        output.task = tokio::spawn(async move {
            let work = async {
                let mut writer = tokio::time::timeout(Duration::from_secs(60), open)
                    .await
                    .map_err(|_| std::io::ErrorKind::TimedOut)??;
                writer.write_all(&preamble()).await?;
                writer.flush().await?;
                while let Some(q) = rx.recv().await {
                    tokio::time::timeout(
                        Duration::from_secs(5),
                        writer.write_all(&packet_block(&q.packet)),
                    )
                    .await
                    .map_err(|_| std::io::ErrorKind::TimedOut)??;
                    writer.flush().await?;
                    let mut s = status.lock().unwrap();
                    if q.packet.source == "S" {
                        s.received += 1;
                    } else {
                        s.sent += 1;
                    }
                }
                Ok::<(), std::io::Error>(())
            };
            let result = tokio::select! { _ = stop.changed() => Ok(()), r = work => r };
            let mut s = status.lock().unwrap();
            s.running = false;
            if result.is_err() {
                s.error = "OUTPUT_CLOSED".into();
            }
        });
        output
    }
    pub async fn udp() -> ffxiv_protocol::Result<Self> {
        let client = tokio::net::UdpSocket::bind("127.0.0.11:0")
            .await
            .map_err(|_| "UDP_BIND_FAILED")?;
        let server = tokio::net::UdpSocket::bind("127.0.0.12:0")
            .await
            .map_err(|_| "UDP_BIND_FAILED")?;
        let client_addr = client.local_addr().map_err(|_| "UDP_BIND_FAILED")?;
        let server_addr = server.local_addr().map_err(|_| "UDP_BIND_FAILED")?;
        let (mut output, mut rx, mut stop) = Self::create("udp", String::new());
        let status = output.status.clone();
        {
            let mut s = status.lock().unwrap();
            s.client_port = client_addr.port();
            s.server_port = server_addr.port();
        }
        output.task = tokio::spawn(async move {
            loop {
                let q = tokio::select! { _ = stop.changed() => break, q = rx.recv() => match q { Some(q) => q, None => break } };
                let p = q.packet;
                if let Some(bytes) = udp_packet(&p) {
                    let send = async {
                        if p.source == "C" {
                            client.send_to(&bytes, server_addr).await
                        } else {
                            server.send_to(&bytes, client_addr).await
                        }
                    };
                    let result = tokio::select! { _ = stop.changed() => break, r = tokio::time::timeout(Duration::from_secs(2), send) => r };
                    let mut s = status.lock().unwrap();
                    if !matches!(result, Ok(Ok(_))) {
                        s.error = "UDP_FAILED".into();
                        break;
                    }
                    if p.source == "C" {
                        s.sent += 1;
                    } else {
                        s.received += 1;
                    }
                } else {
                    status.lock().unwrap().dropped += 1;
                }
            }
            status.lock().unwrap().running = false;
        });
        Ok(output)
    }
    pub fn cancel(&self) {
        self.stop.send_replace(true);
    }
    pub async fn stop(self) {
        self.cancel();
        let _ = self.task.await;
    }
}
#[cfg(windows)]
pub fn named_pipe(path: String) -> ffxiv_protocol::Result<Output> {
    let pipe = tokio::net::windows::named_pipe::ServerOptions::new()
        .first_pipe_instance(true)
        .access_inbound(false)
        .reject_remote_clients(true)
        .create(&path)
        .map_err(|_| "PIPE_CREATE_FAILED")?;
    Ok(Output::stream(path, async move {
        pipe.connect().await?;
        Ok(pipe)
    }))
}
#[cfg(not(windows))]
pub fn named_pipe(_: String) -> ffxiv_protocol::Result<Output> {
    Err("WINDOWS_REQUIRED".into())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn pcapng_blocks_are_self_consistent() {
        let bytes = preamble();
        let mut i = 0;
        while i < bytes.len() {
            let n = u32::from_le_bytes(bytes[i + 4..i + 8].try_into().unwrap()) as usize;
            assert_eq!(&bytes[i + 4..i + 8], &bytes[i + n - 4..i + n]);
            i += n;
        }
        assert_eq!(i, bytes.len());
    }
    #[tokio::test]
    async fn blocked_sink_stops_without_waiting_for_reader() {
        let (writer, _reader) = tokio::io::duplex(1);
        let output = Output::stream("synthetic".into(), async { Ok(writer) });
        tokio::time::timeout(Duration::from_millis(100), output.stop())
            .await
            .unwrap();
    }
}

/// A cloneable producer independent of sink ownership and shutdown.
#[derive(Clone)]
pub struct OutputWriter {
    tx: mpsc::Sender<Queued>,
    memory: Arc<Semaphore>,
    status: Arc<Mutex<OutputStatus>>,
}
impl OutputWriter {
    pub fn write(&self, packet: &Packet) {
        if !self.status.lock().unwrap().running {
            return;
        }
        let permit = self
            .memory
            .clone()
            .try_acquire_many_owned((packet.body.len() + 64) as u32);
        if let Ok(permit) = permit {
            if self
                .tx
                .try_send(Queued {
                    packet: packet.clone(),
                    _permit: permit,
                })
                .is_ok()
            {
                return;
            }
        }
        self.status.lock().unwrap().dropped += 1;
    }
}
