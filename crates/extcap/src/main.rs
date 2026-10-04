mod parent;
use ffxiv_capture_core::{Capture, Event};
use ffxiv_protocol::{Result, Target};
use std::{collections::HashMap, path::PathBuf, time::Duration};
use tokio::io::AsyncWriteExt;
fn arguments() -> Result<HashMap<String, String>> {
    let mut args = std::env::args().skip(1).peekable();
    let mut result = HashMap::new();
    while let Some(arg) = args.next() {
        if !arg.starts_with("--") {
            return Err("INVALID_ARGUMENT".into());
        }
        if let Some((key, value)) = arg.split_once('=') {
            result.insert(key.into(), value.into());
        } else {
            let value = if args.peek().is_some_and(|s| !s.starts_with("--")) {
                args.next().unwrap()
            } else {
                String::new()
            };
            result.insert(arg, value);
        }
    }
    Ok(result)
}
fn display(s: &str) -> String {
    s.chars()
        .filter(|c| !matches!(c, '{' | '}' | '\n' | '\r'))
        .collect()
}
#[tokio::main]
async fn main() {
    if let Err(code) = run().await {
        eprintln!("{code}");
        std::process::exit(1);
    }
}
async fn run() -> Result<()> {
    let args = arguments()?;
    if args.contains_key("--extcap-interfaces") {
        println!("extcap {{version=1.0}}{{help=https://github.com/zhyupe/FFXIV-Packet-Dissector}}");
        for p in ffxiv_game_process::list()? {
            println!(
                "interface {{value=ffxiv-{}-{}}}{{display=FFXIV PID {} · {}}}",
                p.pid,
                p.started_at,
                p.pid,
                display(&p.version)
            );
        }
        return Ok(());
    }
    if args.contains_key("--extcap-dlts") {
        println!("dlt {{number=252}}{{name=WIRESHARK_UPPER_PDU}}{{display=FFXIV decoded IPC}}");
        return Ok(());
    }
    if args.contains_key("--extcap-config") {
        return Ok(());
    }
    if !args.contains_key("--capture") {
        return Err("EXTCAP_CAPTURE_REQUIRED".into());
    }
    let interface = args
        .get("--extcap-interface")
        .and_then(|v| v.strip_prefix("ffxiv-"))
        .ok_or("INVALID_TARGET")?;
    let (pid, start) = interface.split_once('-').ok_or("INVALID_TARGET")?;
    let target = Target {
        pid: pid.parse().map_err(|_| "INVALID_TARGET")?,
        started_at: start.into(),
    };
    if target.started_at.parse::<u64>().is_err() {
        return Err("INVALID_TARGET".into());
    }
    let fifo = args.get("--fifo").ok_or("FIFO_REQUIRED")?;
    #[cfg(windows)]
    let mut writer = {
        if !fifo.starts_with(r"\\.\pipe\") {
            return Err("INVALID_FIFO".into());
        }
        tokio::time::timeout(Duration::from_secs(10), async {
            loop {
                match tokio::net::windows::named_pipe::ClientOptions::new()
                    .read(false)
                    .write(true)
                    .open(fifo)
                {
                    Ok(pipe) => break Ok(pipe),
                    Err(e)
                        if e.raw_os_error() == Some(231)
                            || e.kind() == std::io::ErrorKind::NotFound =>
                    {
                        tokio::time::sleep(Duration::from_millis(50)).await
                    }
                    Err(_) => break Err("FIFO_OPEN_FAILED"),
                }
            }
        })
        .await
        .map_err(|_| "FIFO_TIMEOUT")??
    };
    #[cfg(not(windows))]
    let mut writer = tokio::fs::OpenOptions::new()
        .write(true)
        .open(fifo)
        .await
        .map_err(|_| "FIFO_OPEN_FAILED")?;
    writer
        .write_all(&ffxiv_capture_output::preamble())
        .await
        .map_err(|_| "FIFO_CLOSED")?;
    writer.flush().await.map_err(|_| "FIFO_CLOSED")?;
    let exe = std::env::current_exe().map_err(|_| "RESOURCE_PATH_FAILED")?;
    let dll: PathBuf = exe
        .parent()
        .ok_or("RESOURCE_PATH_FAILED")?
        .join("ffxiv-resources/deucalion.dll");
    let (capture, mut rx) = Capture::start(target, dll);
    let parent_exit = parent::exited();
    tokio::pin!(parent_exit);
    let result = async {
        loop {
            tokio::select! {
                _ = tokio::signal::ctrl_c() => break Ok(()),
                _ = &mut parent_exit => break Ok(()),
                event = rx.recv() => match event {
                    Some(Event::Connected(_)) => {},
                    Some(Event::Packet(p)) => {
                        tokio::time::timeout(Duration::from_secs(5),writer.write_all(&ffxiv_capture_output::packet_block(&p.packet))).await.map_err(|_| "FIFO_TIMEOUT")?.map_err(|_| "FIFO_CLOSED")?;
                        writer.flush().await.map_err(|_| "FIFO_CLOSED")?;
                    },
                    Some(Event::Closed(e)) if !e.is_empty() => break Err(e),
                    _ => break Ok(()),
                }
            }
        }
    }.await;
    capture.stop().await;
    result
}
