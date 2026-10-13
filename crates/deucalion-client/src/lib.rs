//! Length-delimited Deucalion RPC. See UPSTREAM.md for the protocol reference.
use bytes::{Buf, Bytes, BytesMut};
use ffxiv_protocol::{Packet, MAX_FRAME};
use std::{collections::VecDeque, io, time::Duration};
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};

pub const DEFAULT_RECV_SIGNATURE: &str = "E8 $ { ' } 4C 8B 4E 10 8B 46 1C 45";
pub const DEFAULT_SEND_SIGNATURE: &str = "40 53 56 48 83 EC 38 48 8B D9 48 8B F2 8B";
pub const DEFAULT_SEND_LOBBY_SIGNATURE: &str = "40 53 48 83 EC 20 44 8B 41 28";

pub struct HookSignatures {
    pub recv: String,
    pub send: String,
    pub send_lobby: String,
}
impl Default for HookSignatures {
    fn default() -> Self {
        Self {
            recv: DEFAULT_RECV_SIGNATURE.into(),
            send: DEFAULT_SEND_SIGNATURE.into(),
            send_lobby: DEFAULT_SEND_LOBBY_SIGNATURE.into(),
        }
    }
}
impl HookSignatures {
    pub fn validate(&self) -> Result<(), HandshakeError> {
        validate_recv_signature(&self.recv)?;
        for (signature, error) in [
            (&self.send, "INVALID_SEND_SIGNATURE"),
            (&self.send_lobby, "INVALID_SEND_LOBBY_SIGNATURE"),
        ] {
            let tokens: Vec<_> = signature.split_ascii_whitespace().collect();
            if !signature.is_empty()
                && (signature.len() > 512
                    || !(8..=64).contains(&tokens.len())
                    || tokens.iter().any(|t| {
                        *t != "??" && (t.len() != 2 || !t.bytes().all(|b| b.is_ascii_hexdigit()))
                    })
                    || tokens.iter().filter(|t| **t != "??").count() < 6)
            {
                return Err(HandshakeError(error));
            }
        }
        Ok(())
    }
}
#[derive(Clone, Copy)]
enum Hook {
    Recv,
    Send,
    SendLobby,
}
impl Hook {
    fn request(self) -> (u8, u32) {
        match self {
            Self::Recv => (3, 0),
            Self::Send => (4, 1),
            Self::SendLobby => (4, 0),
        }
    }
    fn prefix(self) -> &'static str {
        match self {
            Self::Recv => "RECV",
            _ => "SEND",
        }
    }
    fn error(self, timeout: bool) -> HandshakeError {
        HandshakeError(match (self, timeout) {
            (Self::Recv, false) => "RECV_REPAIR_FAILED",
            (Self::Recv, true) => "RECV_REPAIR_TIMEOUT",
            (Self::Send, false) => "SEND_REPAIR_FAILED",
            (Self::Send, true) => "SEND_REPAIR_TIMEOUT",
            (Self::SendLobby, false) => "SEND_LOBBY_REPAIR_FAILED",
            (Self::SendLobby, true) => "SEND_LOBBY_REPAIR_TIMEOUT",
        })
    }
    fn observes(self, frame: &Frame) -> bool {
        let (op, _) = self.request();
        frame.op == op
            && frame.channel
                == if matches!(self, Self::SendLobby) {
                    0
                } else {
                    1
                }
            && frame.data.len() >= 32
    }
}
const HANDSHAKE_BUFFER_LIMIT: usize = 1024 * 1024;

#[derive(Debug, PartialEq, Eq)]
pub struct HandshakeError(pub &'static str);
impl From<io::Error> for HandshakeError {
    fn from(_: io::Error) -> Self {
        Self("HANDSHAKE_FAILED")
    }
}

/// Only accept a direct-call target followed by a bounded byte/wildcard suffix.
/// This deliberately excludes arbitrary pelite control-flow expressions.
pub fn validate_recv_signature(signature: &str) -> Result<(), HandshakeError> {
    if signature.is_empty() {
        return Ok(());
    }
    let tokens: Vec<_> = signature.split_ascii_whitespace().collect();
    if signature.len() > 512
        || tokens.len() < 13
        || tokens.len() > 69
        || tokens[..5] != ["E8", "$", "{", "'", "}"]
        || tokens[5..]
            .iter()
            .any(|t| *t != "??" && (t.len() != 2 || !t.bytes().all(|b| b.is_ascii_hexdigit())))
        || tokens[5..].iter().filter(|t| **t != "??").count() < 6
    {
        return Err(HandshakeError("INVALID_RECV_SIGNATURE"));
    }
    Ok(())
}

pub struct Frame {
    pub op: u8,
    pub channel: u32,
    pub data: Bytes,
}
#[derive(Default)]
pub struct Decoder {
    buffered: BytesMut,
}
impl Decoder {
    pub fn push(&mut self, bytes: &[u8]) -> io::Result<()> {
        if self.buffered.len() + bytes.len() > MAX_FRAME + 65536 {
            return Err(io::ErrorKind::InvalidData.into());
        }
        self.buffered.extend_from_slice(bytes);
        Ok(())
    }
    pub fn next_frame(&mut self) -> io::Result<Option<Frame>> {
        if self.buffered.len() < 4 {
            return Ok(None);
        }
        let n = u32::from_le_bytes(self.buffered[..4].try_into().unwrap()) as usize;
        if !(9..=MAX_FRAME).contains(&n) {
            return Err(io::ErrorKind::InvalidData.into());
        }
        if self.buffered.len() < n {
            return Ok(None);
        }
        let mut b = self.buffered.split_to(n).freeze();
        b.advance(4);
        Ok(Some(Frame {
            op: b.get_u8(),
            channel: b.get_u32_le(),
            data: b,
        }))
    }
    pub fn is_empty(&self) -> bool {
        self.buffered.is_empty()
    }
}
pub struct Connection<S> {
    stream: S,
    decoder: Decoder,
    pending: VecDeque<Frame>,
    pending_bytes: usize,
}
impl<S: AsyncRead + AsyncWrite + Unpin> Connection<S> {
    pub fn new(stream: S) -> Self {
        Self {
            stream,
            decoder: Decoder::default(),
            pending: VecDeque::new(),
            pending_bytes: 0,
        }
    }
    pub async fn receive(&mut self) -> io::Result<Frame> {
        if let Some(frame) = self.pending.pop_front() {
            self.pending_bytes -= frame.data.len() + 9;
            return Ok(frame);
        }
        self.receive_wire().await
    }
    async fn receive_wire(&mut self) -> io::Result<Frame> {
        loop {
            if let Some(frame) = self.decoder.next_frame()? {
                return Ok(frame);
            }
            let mut bytes = [0; 65536];
            let n = self.stream.read(&mut bytes).await?;
            if n == 0 {
                return Err(io::ErrorKind::UnexpectedEof.into());
            }
            self.decoder.push(&bytes[..n])?;
        }
    }
    pub async fn send(&mut self, op: u8, channel: u32, bytes: &[u8]) -> io::Result<()> {
        let mut frame = Vec::with_capacity(9 + bytes.len());
        frame.extend_from_slice(&((9 + bytes.len()) as u32).to_le_bytes());
        frame.push(op);
        frame.extend_from_slice(&channel.to_le_bytes());
        frame.extend_from_slice(bytes);
        self.stream.write_all(&frame).await
    }
    fn retain(&mut self, frame: Frame) -> Result<(), HandshakeError> {
        self.pending_bytes += frame.data.len() + 9;
        if self.pending_bytes > HANDSHAKE_BUFFER_LIMIT || self.pending.len() >= 256 {
            return Err(HandshakeError("HANDSHAKE_OVERFLOW"));
        }
        self.pending.push_back(frame);
        Ok(())
    }
    async fn repair_hook(&mut self, hook: Hook, signature: &str) -> Result<(), HandshakeError> {
        let (op, channel) = hook.request();
        self.send(op, channel, signature.as_bytes()).await?;
        let ok = format!("{} OK", hook.prefix());
        let initialized = format!(
            "{} error initializing hook: Detour is already initialized",
            hook.prefix()
        );
        let prefix = format!("{} ", hook.prefix());
        tokio::time::timeout(Duration::from_secs(3), async {
            let mut received = false;
            let mut already_initialized = false;
            loop {
                let frame = self.receive_wire().await?;
                if frame.op == 0 && frame.channel == channel {
                    if frame.data.as_ref() == ok.as_bytes() {
                        return Ok(());
                    }
                    if frame.data.as_ref() == initialized.as_bytes() {
                        // Upstream HELLO keeps the startup status after runtime repair.
                        // A stale OFF flag is not proof that the existing hook works.
                        already_initialized = true;
                    } else if frame.data.starts_with(prefix.as_bytes()) {
                        return Err(hook.error(false));
                    }
                }
                if hook.observes(&frame) {
                    received = true;
                }
                if frame.op == 3 || frame.op == 4 {
                    self.retain(frame)?;
                }
                if already_initialized && received {
                    return Ok(());
                }
            }
        })
        .await
        .map_err(|_| hook.error(true))?
    }
    #[cfg(test)]
    async fn handshake(&mut self, recv_signature: &str) -> Result<(), HandshakeError> {
        self.handshake_with_signatures(&HookSignatures {
            recv: recv_signature.into(),
            ..HookSignatures::default()
        })
        .await
    }
    pub async fn handshake_with_signatures(
        &mut self,
        signatures: &HookSignatures,
    ) -> Result<(), HandshakeError> {
        signatures.validate()?;
        let hello = self.receive_wire().await?;
        if hello.op != 0 || hello.channel != 9000 {
            return Err(HandshakeError("HANDSHAKE_FAILED"));
        }
        let text =
            std::str::from_utf8(&hello.data).map_err(|_| HandshakeError("HANDSHAKE_FAILED"))?;
        let (version, status) = text
            .strip_prefix("SERVER HELLO. VERSION: ")
            .and_then(|s| s.split_once(". HOOK STATUS: RECV "))
            .ok_or(HandshakeError("HOOK_STATUS_UNKNOWN"))?;
        let fields: Vec<_> = status.trim_end_matches('.').split(". ").collect();
        if fields.len() != 4 {
            return Err(HandshakeError("HOOK_STATUS_UNKNOWN"));
        }
        let parse = |value: &str| match value {
            "ON" => Ok(true),
            "OFF" => Ok(false),
            _ => Err(HandshakeError("HOOK_STATUS_UNKNOWN")),
        };
        let recv = parse(fields[0])?;
        let send = parse(
            fields[1]
                .strip_prefix("SEND ")
                .ok_or(HandshakeError("HOOK_STATUS_UNKNOWN"))?,
        )?;
        let lobby = parse(
            fields[2]
                .strip_prefix("SEND_LOBBY ")
                .ok_or(HandshakeError("HOOK_STATUS_UNKNOWN"))?,
        )?;
        let create = parse(
            fields[3]
                .strip_prefix("CREATE_TARGET ")
                .ok_or(HandshakeError("HOOK_STATUS_UNKNOWN"))?,
        )?;
        // Deucalion exposes no runtime override for the deobfuscation hook.
        if !create {
            return Err(HandshakeError("CREATE_TARGET_HOOK_UNAVAILABLE"));
        }
        let repairs = [
            (Hook::Recv, recv, &signatures.recv, "RECV_HOOK_UNAVAILABLE"),
            (Hook::Send, send, &signatures.send, "SEND_HOOK_UNAVAILABLE"),
            (
                Hook::SendLobby,
                lobby,
                &signatures.send_lobby,
                "SEND_LOBBY_HOOK_UNAVAILABLE",
            ),
        ];
        // Validate every missing hook before changing the shared DLL state.
        for (_, enabled, signature, error) in &repairs {
            if !enabled {
                if signature.is_empty() {
                    return Err(HandshakeError(error));
                }
                if version != "1.5.0" {
                    return Err(HandshakeError("HOOK_REPAIR_UNSUPPORTED"));
                }
            }
        }
        // Upstream defaults to Zone receive only. Enable sends before checking
        // stale startup flags; acknowledgements alone cannot verify old hooks.
        if !send || !lobby {
            self.send(5, 0x3f, &[]).await?;
        }
        for (hook, enabled, signature, _) in repairs {
            if !enabled {
                self.repair_hook(hook, signature).await?;
            }
        }
        self.send(0, 9000, b"FFXIV_PACKET_DISSECTOR").await?;
        self.send(5, 0x3f, &[]).await?;
        Ok(())
    }
}
impl Frame {
    pub fn into_packet(self, sequence: u64) -> io::Result<Option<Packet>> {
        if self.op != 3 && self.op != 4 {
            return Ok(None);
        }
        if self.data.len() < 32 {
            return Err(io::ErrorKind::InvalidData.into());
        }
        let b = &self.data;
        Ok(Some(Packet {
            sequence,
            channel: self.channel,
            source: if self.op == 3 { "S" } else { "C" }.into(),
            source_actor: u32::from_le_bytes(b[..4].try_into().unwrap()),
            target_actor: u32::from_le_bytes(b[4..8].try_into().unwrap()),
            timestamp_ms: u64::from_le_bytes(b[8..16].try_into().unwrap()),
            ipc: b[16..32].try_into().unwrap(),
            body: self.data.slice(32..),
        }))
    }
}
#[cfg(windows)]
pub async fn open(
    pid: u32,
) -> io::Result<Connection<tokio::net::windows::named_pipe::NamedPipeClient>> {
    let path = format!(r"\\.\pipe\deucalion-{pid}");
    let start = std::time::Instant::now();
    loop {
        match tokio::net::windows::named_pipe::ClientOptions::new().open(&path) {
            Ok(pipe) => return Ok(Connection::new(pipe)),
            Err(e) if e.raw_os_error() == Some(231) && start.elapsed().as_secs() < 5 => {
                tokio::time::sleep(std::time::Duration::from_millis(50)).await
            }
            Err(e) => return Err(e),
        }
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn send_signature_validation_is_bounded() {
        let mut signatures = HookSignatures::default();
        signatures.validate().unwrap();
        for bad in [
            "?? ?? ?? ?? ?? ?? ?? ??",
            "40 53 $ { ' } 00 00",
            "40 53",
            "GG 53 48 83 EC 20 44 8B",
        ] {
            signatures.send = bad.into();
            assert_eq!(
                signatures.validate(),
                Err(HandshakeError("INVALID_SEND_SIGNATURE"))
            );
            signatures.send = DEFAULT_SEND_SIGNATURE.into();
            signatures.send_lobby = bad.into();
            assert_eq!(
                signatures.validate(),
                Err(HandshakeError("INVALID_SEND_LOBBY_SIGNATURE"))
            );
            signatures.send_lobby = DEFAULT_SEND_LOBBY_SIGNATURE.into();
        }
    }
    #[tokio::test]
    async fn repairs_all_hooks_with_correct_channels_and_preserves_packets() {
        let (a, b) = tokio::io::duplex(8192);
        let server = tokio::spawn(async move {
            let mut c = Connection::new(a);
            c.send(0, 9000, b"SERVER HELLO. VERSION: 1.5.0. HOOK STATUS: RECV OFF. SEND OFF. SEND_LOBBY OFF. CREATE_TARGET ON.").await.unwrap();
            let options = c.receive().await.unwrap();
            assert_eq!((options.op, options.channel), (5, 0x3f));
            for (op, channel, signature, ack) in [
                (3, 0, DEFAULT_RECV_SIGNATURE, "RECV OK"),
                (4, 1, DEFAULT_SEND_SIGNATURE, "SEND OK"),
                (4, 0, DEFAULT_SEND_LOBBY_SIGNATURE, "SEND OK"),
            ] {
                let request = c.receive().await.unwrap();
                assert_eq!((request.op, request.channel), (op, channel));
                assert_eq!(request.data.as_ref(), signature.as_bytes());
                c.send(op, if op == 3 { 1 } else { channel }, &[0; 32])
                    .await
                    .unwrap();
                c.send(0, channel, ack.as_bytes()).await.unwrap();
            }
            server_finish(&mut c).await;
        });
        let mut c = Connection::new(b);
        c.handshake_with_signatures(&HookSignatures::default())
            .await
            .unwrap();
        for (op, channel) in [(3, 1), (4, 1), (4, 0)] {
            let frame = c.receive().await.unwrap();
            assert_eq!((frame.op, frame.channel), (op, channel));
        }
        server.await.unwrap();
    }
    #[tokio::test]
    async fn send_repairs_ignore_wrong_ack_channel_and_check_stale_status() {
        for (name, channel, hook) in [("SEND", 1, Hook::Send), ("SEND_LOBBY", 0, Hook::SendLobby)] {
            let (a, b) = tokio::io::duplex(8192);
            let server = tokio::spawn(async move {
                let mut c = Connection::new(a);
                let hello = format!("SERVER HELLO. VERSION: 1.5.0. HOOK STATUS: RECV ON. SEND {}. SEND_LOBBY {}. CREATE_TARGET ON.",
                    if channel == 1 { "OFF" } else { "ON" }, if channel == 0 { "OFF" } else { "ON" });
                c.send(0, 9000, hello.as_bytes()).await.unwrap();
                assert_eq!(c.receive().await.unwrap().op, 5);
                let request = c.receive().await.unwrap();
                assert_eq!((request.op, request.channel), (4, channel));
                c.send(0, 1 - channel, b"SEND OK").await.unwrap();
                c.send(0, channel, b"RECV OK").await.unwrap();
                c.send(
                    0,
                    channel,
                    b"SEND error initializing hook: Detour is already initialized",
                )
                .await
                .unwrap();
                c.send(3, channel, &[0; 32]).await.unwrap();
                c.send(4, 1 - channel, &[0; 32]).await.unwrap();
                c.send(4, channel, &[0; 31]).await.unwrap();
                assert!(
                    tokio::time::timeout(Duration::from_millis(30), c.receive())
                        .await
                        .is_err(),
                    "{name}"
                );
                c.send(4, channel, &[0; 32]).await.unwrap();
                server_finish(&mut c).await;
            });
            Connection::new(b)
                .handshake_with_signatures(&HookSignatures::default())
                .await
                .unwrap();
            server.await.unwrap();
            assert!(hook.observes(&Frame {
                op: 4,
                channel,
                data: Bytes::from(vec![0; 32])
            }));
        }
    }
    #[tokio::test]
    async fn disabled_send_preflight_does_not_modify_any_hook() {
        let (a, b) = tokio::io::duplex(4096);
        let mut server = Connection::new(a);
        server.send(0, 9000, b"SERVER HELLO. VERSION: 1.5.0. HOOK STATUS: RECV OFF. SEND OFF. SEND_LOBBY ON. CREATE_TARGET ON.").await.unwrap();
        let mut client = Connection::new(b);
        let signatures = HookSignatures {
            send: String::new(),
            ..HookSignatures::default()
        };
        assert_eq!(
            client.handshake_with_signatures(&signatures).await,
            Err(HandshakeError("SEND_HOOK_UNAVAILABLE"))
        );
        drop(client);
        assert!(server.receive().await.is_err());
    }
    #[test]
    fn fragments_and_invalid_lengths() {
        let mut d = Decoder::default();
        let data = [10, 0, 0, 0, 0, 1, 0, 0, 0, 42];
        for chunk in data.chunks(3) {
            d.push(chunk).unwrap();
        }
        let f = d.next_frame().unwrap().unwrap();
        assert_eq!(&f.data[..], &[42]);
        assert!(d.is_empty());
        d.push(&[8, 0, 0, 0]).unwrap();
        assert!(d.next_frame().is_err());
    }
    #[tokio::test]
    async fn handshake_and_truncated_stream() {
        let (a, b) = tokio::io::duplex(4096);
        let task = tokio::spawn(async move {
            let mut c = Connection::new(a);
            c.send(0, 9000, b"SERVER HELLO. VERSION: 1.5.0. HOOK STATUS: RECV ON. SEND ON. SEND_LOBBY ON. CREATE_TARGET ON.").await.unwrap();
            assert_eq!(c.receive().await.unwrap().channel, 9000);
            assert_eq!(c.receive().await.unwrap().channel, 0x3f);
        });
        let mut c = Connection::new(b);
        c.handshake(DEFAULT_RECV_SIGNATURE).await.unwrap();
        task.await.unwrap();
        assert!(c.receive().await.is_err());
    }
    const HELLO_OFF: &[u8] = b"SERVER HELLO. VERSION: 1.5.0. HOOK STATUS: RECV OFF. SEND ON. SEND_LOBBY ON. CREATE_TARGET ON.";
    const ALREADY_INITIALIZED: &[u8] =
        b"RECV error initializing hook: Detour is already initialized";

    async fn server_repair_request(c: &mut Connection<tokio::io::DuplexStream>) {
        c.send(0, 9000, HELLO_OFF).await.unwrap();
        let request = c.receive().await.unwrap();
        assert_eq!((request.op, request.channel), (3, 0));
        assert_eq!(request.data.as_ref(), DEFAULT_RECV_SIGNATURE.as_bytes());
    }
    async fn server_finish(c: &mut Connection<tokio::io::DuplexStream>) {
        assert_eq!(c.receive().await.unwrap().channel, 9000);
        let options = c.receive().await.unwrap();
        assert_eq!((options.op, options.channel), (5, 0x3f));
    }
    #[test]
    fn signature_validation() {
        for value in [
            "",
            DEFAULT_RECV_SIGNATURE,
            "E8 $ { ' } 4C 8B 4F 10 8B 47 ?? ??",
        ] {
            assert!(validate_recv_signature(value).is_ok());
        }
        for value in [
            "??",
            "E8 $ { ' } ?? ?? ?? ?? ?? ?? ?? ??",
            "E8 $ { ' } 4C 8B 4E 10 8B 46 1C GG",
            "E8 $ { ' } 4C 8B 4E 10 8B 46 1C (45)",
        ] {
            assert_eq!(
                validate_recv_signature(value),
                Err(HandshakeError("INVALID_RECV_SIGNATURE"))
            );
        }
    }
    #[tokio::test]
    async fn repairs_and_preserves_interleaved_packets() {
        let (a, b) = tokio::io::duplex(4096);
        let server = tokio::spawn(async move {
            let mut c = Connection::new(a);
            server_repair_request(&mut c).await;
            c.send(0, 9000, b"unrelated status").await.unwrap();
            c.send(3, 1, &[0; 32]).await.unwrap();
            c.send(0, 0, b"RECV OK").await.unwrap();
            server_finish(&mut c).await;
        });
        let mut c = Connection::new(b);
        c.handshake(DEFAULT_RECV_SIGNATURE).await.unwrap();
        let frame = c.receive().await.unwrap();
        assert_eq!((frame.op, frame.channel, frame.data.len()), (3, 1, 32));
        server.await.unwrap();
    }
    #[tokio::test]
    async fn stale_off_requires_actual_zone_receive() {
        for packet_before_ack in [true, false] {
            let (a, b) = tokio::io::duplex(4096);
            let server = tokio::spawn(async move {
                let mut c = Connection::new(a);
                server_repair_request(&mut c).await;
                if packet_before_ack {
                    c.send(3, 1, &[0; 32]).await.unwrap();
                }
                c.send(0, 0, ALREADY_INITIALIZED).await.unwrap();
                if !packet_before_ack {
                    c.send(3, 1, &[0; 32]).await.unwrap();
                }
                server_finish(&mut c).await;
            });
            let mut c = Connection::new(b);
            c.handshake(DEFAULT_RECV_SIGNATURE).await.unwrap();
            assert_eq!(c.receive().await.unwrap().op, 3);
            server.await.unwrap();
        }
    }
    #[tokio::test]
    async fn rejects_repair_failure_without_exposing_debug_text() {
        let (a, b) = tokio::io::duplex(4096);
        let server = tokio::spawn(async move {
            let mut c = Connection::new(a);
            server_repair_request(&mut c).await;
            c.send(0, 0, b"RECV internal error with private diagnostic")
                .await
                .unwrap();
        });
        let result = Connection::new(b).handshake(DEFAULT_RECV_SIGNATURE).await;
        assert_eq!(result, Err(HandshakeError("RECV_REPAIR_FAILED")));
        server.await.unwrap();
    }
    #[tokio::test]
    async fn disabled_or_unsupported_repair_sends_nothing() {
        for (hello, signature, error) in [
            (HELLO_OFF.to_vec(), "", "RECV_HOOK_UNAVAILABLE"),
            (
                String::from_utf8_lossy(HELLO_OFF)
                    .replace("1.5.0", "1.4.0")
                    .into_bytes(),
                DEFAULT_RECV_SIGNATURE,
                "HOOK_REPAIR_UNSUPPORTED",
            ),
            (
                String::from_utf8_lossy(HELLO_OFF)
                    .replace("CREATE_TARGET ON", "CREATE_TARGET OFF")
                    .into_bytes(),
                DEFAULT_RECV_SIGNATURE,
                "CREATE_TARGET_HOOK_UNAVAILABLE",
            ),
            (
                b"unknown hello".to_vec(),
                DEFAULT_RECV_SIGNATURE,
                "HOOK_STATUS_UNKNOWN",
            ),
        ] {
            let (a, b) = tokio::io::duplex(4096);
            let mut server = Connection::new(a);
            server.send(0, 9000, &hello).await.unwrap();
            let mut client = Connection::new(b);
            assert_eq!(
                client.handshake(signature).await,
                Err(HandshakeError(error))
            );
            drop(client);
            assert!(server.receive().await.is_err());
        }
    }
    #[tokio::test]
    async fn repair_timeout_does_not_accept_send_or_short_receive() {
        let (a, b) = tokio::io::duplex(4096);
        let server = tokio::spawn(async move {
            let mut c = Connection::new(a);
            server_repair_request(&mut c).await;
            c.send(0, 0, ALREADY_INITIALIZED).await.unwrap();
            c.send(4, 1, &[0; 32]).await.unwrap();
            c.send(3, 1, &[0; 16]).await.unwrap();
            c.send(0, 1, b"RECV OK").await.unwrap();
            let _ = c.receive().await;
        });
        let mut client = Connection::new(b);
        assert_eq!(
            client.handshake(DEFAULT_RECV_SIGNATURE).await,
            Err(HandshakeError("RECV_REPAIR_TIMEOUT"))
        );
        drop(client);
        server.await.unwrap();
    }
    #[tokio::test]
    async fn repair_buffer_is_bounded() {
        let (a, b) = tokio::io::duplex(4096);
        let server = tokio::spawn(async move {
            let mut c = Connection::new(a);
            server_repair_request(&mut c).await;
            for _ in 0..257 {
                if c.send(4, 1, &[0; 32]).await.is_err() {
                    break;
                }
            }
        });
        let mut client = Connection::new(b);
        assert_eq!(
            client.handshake(DEFAULT_RECV_SIGNATURE).await,
            Err(HandshakeError("HANDSHAKE_OVERFLOW"))
        );
        drop(client);
        server.await.unwrap();
    }
    #[tokio::test]
    async fn custom_signature_and_fragmented_ack() {
        const CUSTOM: &str = "E8 $ { ' } 4C 8B 4F 10 8B 47 1C 45";
        let (a, b) = tokio::io::duplex(4096);
        let server = tokio::spawn(async move {
            let mut c = Connection::new(a);
            c.send(0, 9000, HELLO_OFF).await.unwrap();
            let request = c.receive().await.unwrap();
            assert_eq!(request.data.as_ref(), CUSTOM.as_bytes());
            let mut ack = Vec::new();
            ack.extend_from_slice(&16u32.to_le_bytes());
            ack.extend_from_slice(&[0; 5]);
            ack.extend_from_slice(b"RECV OK");
            for chunk in ack.chunks(2) {
                c.stream.write_all(chunk).await.unwrap();
                tokio::task::yield_now().await;
            }
            server_finish(&mut c).await;
        });
        Connection::new(b).handshake(CUSTOM).await.unwrap();
        server.await.unwrap();
    }
}
