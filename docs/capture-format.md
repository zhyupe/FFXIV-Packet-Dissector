# Decoded IPC capture format

The stream is pcapng, with a Section Header Block, one Interface Description Block
(LINKTYPE_WIRESHARK_UPPER_PDU = 252, unlimited snaplen, if_tsresol = 3), and one
Enhanced Packet Block per decoded IPC message. Time is Deucalion's Unix epoch
milliseconds, not the actual network arrival time at nanosecond precision.

Each EPB starts with big-endian Exported PDU TLVs: tag 12 containing the padded
ASCII dissector name `ffxiv_deucalion`, then tag 0 / length 0. The following custom
header uses little-endian integers:

| Offset | Type | Meaning |
| --- | --- | --- |
| 0 | u16 | Format version, currently 1 |
| 2 | u8 | Direction: 0 client to server, 1 server to client |
| 3 | u8 | Reserved |
| 4 | u32 | Deucalion channel: 0 Lobby, 1 Zone, 2 Chat |
| 8 | u32 | Source actor |
| 12 | u32 | Target actor |
| 16 | bytes[16] | Original IPC header |
| 32 | bytes[] | IPC body |

The Lua wrapper dispatches Zone messages to the existing IPC dissector with an
explicit direction. Lobby/Chat currently display raw IPC until category-specific
Lua maps exist; they must not be decoded using a Zone opcode table. Legacy UDP
captures continue to derive direction from their existing loopback addresses.
The compatibility UDP sink emits only Zone messages and preserves its prior
bundle/segment/IPC envelope, source addresses and dynamic ports.

For Desktop capture the application creates the outbound named pipe and Wireshark
opens it. For extcap capture Wireshark supplies `--fifo`; extcap opens that pipe as
a client. Each stream gets a fresh pcapng preamble. Writers have bounded queues and
write deadlines. This format represents decompressed game IPC, not original TCP
or UDP frames.

References:
- https://www.wireshark.org/docs/man-pages/extcap.html
- https://www.wireshark.org/docs/wsar_html/exported__pdu__tlvs_8h.html
- https://github.com/ff14wed/deucalion/tree/1.5.0
