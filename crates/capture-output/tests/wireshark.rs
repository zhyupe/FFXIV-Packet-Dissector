use ffxiv_capture_output::{packet_block, preamble};
use ffxiv_protocol::Packet;
use std::{fs, path::Path, process::Command};

/// Requires tshark and its Lua support. CI explicitly runs this integration test.
#[test]
#[ignore = "requires tshark; run with --ignored"]
fn real_tshark_reads_synthetic_pcapng_and_lua_direction() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../..")
        .canonicalize()
        .unwrap();
    let directory = std::env::temp_dir().join(format!("ffxiv-pcapng-test-{}", std::process::id()));
    fs::create_dir_all(&directory).unwrap();
    let mut bytes = preamble();
    for (i, source, channel) in [(0, "S", 1), (1, "C", 1), (2, "S", 2)] {
        let mut ipc = [0; 16];
        ipc[0..2].copy_from_slice(&0x14u16.to_le_bytes());
        ipc[2..4].copy_from_slice(&0xf001u16.to_le_bytes());
        let packet = Packet {
            sequence: i + 1,
            channel,
            source: source.into(),
            source_actor: 0,
            target_actor: 0,
            timestamp_ms: 123456000 + i,
            ipc,
            body: vec![0; 4].into(),
        };
        bytes.extend(packet_block(&packet));
    }
    let capture = directory.join("synthetic.pcapng");
    fs::write(&capture, bytes).unwrap();
    let src = root.join("src").to_string_lossy().replace('\\', "/");
    let lua = directory.join("load.lua");
    fs::write(&lua,format!("package.path = [[{src}/?.lua;]] .. package.path\ndofile([[{src}/ffxiv_ipc.lua]])\ndofile([[{src}/ffxiv_deucalion.lua]])\n")).unwrap();
    let tshark = std::env::var_os("TSHARK").unwrap_or_else(|| "tshark".into());
    let output = Command::new(tshark)
        .args(["-n", "-r"])
        .arg(&capture)
        .arg("-X")
        .arg(format!("lua_script:{}", lua.display()))
        .args([
            "-T",
            "fields",
            "-e",
            "ffxiv_deucalion.direction",
            "-e",
            "ffxiv_deucalion.channel",
            "-e",
            "ffxiv_ipc.type",
            "-e",
            "_ws.col.Info",
            "-e",
            "frame.time_epoch",
        ])
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let text = String::from_utf8(output.stdout).unwrap();
    let lines: Vec<_> = text.lines().collect();
    assert_eq!(lines.len(), 3);
    assert!(lines[0].starts_with("1\t1\t0xf001\tIPC(S f001)"), "{text}");
    assert!(lines[1].starts_with("0\t1\t0xf001\tIPC(C f001)"), "{text}");
    assert!(
        lines[2].starts_with("1\t2\t\tDecoded IPC (unmapped channel)"),
        "{text}"
    );
    assert!(lines[0].ends_with("123456.000000000"), "{text}");
    fs::remove_dir_all(directory).unwrap();
}
