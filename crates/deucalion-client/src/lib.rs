//! Length-delimited Deucalion RPC. See UPSTREAM.md for the protocol reference.
use bytes::{Buf, Bytes, BytesMut};
use ffxiv_protocol::{Packet, MAX_FRAME};
use std::io;
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};
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
}
impl<S: AsyncRead + AsyncWrite + Unpin> Connection<S> {
    pub fn new(stream: S) -> Self {
        Self {
            stream,
            decoder: Decoder::default(),
        }
    }
    pub async fn receive(&mut self) -> io::Result<Frame> {
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
    pub async fn handshake(&mut self) -> io::Result<()> {
        let hello = self.receive().await?;
        if hello.op != 0 || hello.channel != 9000 {
            return Err(io::ErrorKind::InvalidData.into());
        }
        self.send(0, 9000, b"FFXIV_PACKET_DISSECTOR").await?;
        self.send(5, 0x3f, &[]).await
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
        let (a, b) = tokio::io::duplex(128);
        let task = tokio::spawn(async move {
            let mut c = Connection::new(a);
            c.send(0, 9000, &[]).await.unwrap();
            assert_eq!(c.receive().await.unwrap().channel, 9000);
            assert_eq!(c.receive().await.unwrap().channel, 0x3f);
        });
        let mut c = Connection::new(b);
        c.handshake().await.unwrap();
        task.await.unwrap();
        assert!(c.receive().await.is_err());
    }
}
