use ffxiv_capture_core::Event;
use ffxiv_capture_output::OutputWriter;
use ffxiv_protocol::{GameProcess, Packet};
use std::sync::{
    atomic::{AtomicBool, AtomicU64, Ordering},
    Arc, Mutex,
};
use tokio::sync::{mpsc, OwnedSemaphorePermit, Semaphore};
pub struct Queued {
    pub packet: Packet,
    _permit: OwnedSemaphorePermit,
}
pub enum Routed {
    Connected(GameProcess),
    Packet(Queued),
    Closed(String),
}
/// Output never waits for wizard commands, storage or Worker responses.
pub fn start(
    mut capture: mpsc::Receiver<Event>,
    output: Arc<Mutex<Option<OutputWriter>>>,
    overflow: Arc<AtomicBool>,
    observing: Arc<AtomicBool>,
    latest: Arc<AtomicU64>,
) -> (tokio::task::JoinHandle<()>, mpsc::Receiver<Routed>) {
    let (tx, rx) = mpsc::channel(256);
    let task = tokio::spawn(async move {
        let memory = Arc::new(Semaphore::new(4 * 1024 * 1024));
        while let Some(event) = capture.recv().await {
            match event {
                Event::Packet(captured) => {
                    latest.store(captured.packet.sequence, Ordering::Release);
                    if let Some(writer) = output.lock().unwrap().as_ref() {
                        writer.write(&captured.packet);
                    }
                    if !observing.load(Ordering::Acquire) {
                        continue;
                    }
                    let packet = captured.packet;
                    if let Ok(permit) = memory
                        .clone()
                        .try_acquire_many_owned((packet.body.len() + 64) as u32)
                    {
                        if tx
                            .try_send(Routed::Packet(Queued {
                                packet,
                                _permit: permit,
                            }))
                            .is_ok()
                        {
                            continue;
                        }
                    }
                    overflow.store(true, Ordering::Release);
                }
                Event::Connected(process) => {
                    if tx.send(Routed::Connected(process)).await.is_err() {
                        return;
                    }
                }
                Event::Closed(error) => {
                    let _ = tx.send(Routed::Closed(error)).await;
                    return;
                }
            }
        }
    });
    (task, rx)
}

#[cfg(test)]
mod tests {
    use super::*;
    use ffxiv_capture_core::Captured;
    use ffxiv_capture_output::Output;
    use tokio::io::AsyncReadExt;
    #[tokio::test]
    async fn blocked_wizard_does_not_stop_output_and_input_waits_do_not_queue() {
        let (sink, mut reader) = tokio::io::duplex(65536);
        let output = Output::stream("synthetic".into(), async { Ok(sink) });
        let writers = Arc::new(Mutex::new(Some(output.writer())));
        let (tx, rx) = mpsc::channel(1024);
        let overflow = Arc::new(AtomicBool::new(false));
        let observing = Arc::new(AtomicBool::new(false));
        let latest = Arc::new(AtomicU64::new(0));
        let (router, mut wizard) = start(
            rx,
            writers,
            overflow.clone(),
            observing.clone(),
            latest.clone(),
        );
        let memory = Arc::new(Semaphore::new(1024 * 1024));
        let packet = |sequence| Packet {
            sequence,
            channel: 1,
            source: "S".into(),
            source_actor: 0,
            target_actor: 0,
            timestamp_ms: 0,
            ipc: [0; 16],
            body: bytes::Bytes::from_static(&[0; 4]),
        };
        tx.send(Event::Packet(
            Captured::with_budget(packet(1), &memory).unwrap(),
        ))
        .await
        .unwrap();
        while latest.load(Ordering::Acquire) < 1 {
            tokio::task::yield_now().await;
        }
        assert!(wizard.try_recv().is_err());
        observing.store(true, Ordering::Release);
        for sequence in 2..302 {
            tx.send(Event::Packet(
                Captured::with_budget(packet(sequence), &memory).unwrap(),
            ))
            .await
            .unwrap();
        }
        while latest.load(Ordering::Acquire) < 301 {
            tokio::task::yield_now().await;
        }
        assert!(overflow.load(Ordering::Acquire));
        // Sink continues consuming while the wizard receiver deliberately remains blocked.
        let consume = tokio::spawn(async move {
            let mut n = 0;
            let mut b = [0; 8192];
            while let Ok(size) = reader.read(&mut b).await {
                if size == 0 {
                    break;
                }
                n += size;
            }
            n
        });
        tokio::time::timeout(std::time::Duration::from_secs(2), async {
            loop {
                if output.status.lock().unwrap().received == 301 {
                    break;
                }
                tokio::task::yield_now().await;
            }
        })
        .await
        .unwrap();
        router.abort();
        let _ = router.await;
        output.stop().await;
        assert!(consume.await.unwrap() > 0);
    }
}
