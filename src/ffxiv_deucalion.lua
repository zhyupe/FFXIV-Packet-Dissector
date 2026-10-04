-- Exported PDU payload version 1. Offsets are documented in docs/capture-format.md.
local protocol = Proto("ffxiv_deucalion", "FFXIV Deucalion IPC")
local fields = {
    version = ProtoField.uint16("ffxiv_deucalion.version", "Format version", base.DEC),
    direction = ProtoField.uint8("ffxiv_deucalion.direction", "Direction", base.DEC, {[0]="Client to server", [1]="Server to client"}),
    channel = ProtoField.uint32("ffxiv_deucalion.channel", "Channel", base.DEC, {[0]="Lobby", [1]="Zone", [2]="Chat"}),
    source = ProtoField.uint32("ffxiv_deucalion.source_actor", "Source actor", base.HEX),
    target = ProtoField.uint32("ffxiv_deucalion.target_actor", "Target actor", base.HEX),
}
protocol.fields = fields
function protocol.dissector(buffer, info, root)
    if buffer:len() < 32 or buffer(0,2):le_uint() ~= 1 then
        Dissector.get("data"):call(buffer,info,root)
        return
    end
    local tree = root:add(protocol,buffer)
    tree:add_le(fields.version,buffer(0,2))
    tree:add(fields.direction,buffer(2,1))
    tree:add_le(fields.channel,buffer(4,4))
    tree:add_le(fields.source,buffer(8,4))
    tree:add_le(fields.target,buffer(12,4))
    if buffer(4,4):le_uint() == 1 and buffer(2,1):uint() <= 1 then
        info.private.ffxiv_direction = buffer(2,1):uint() == 1 and "S" or "C"
        Dissector.get("ffxiv_ipc"):call(buffer(16):tvb(),info,root)
        info.private.ffxiv_direction = nil
    else
        info.cols.protocol:set("FFXIV")
        info.cols.info:set("Decoded IPC (unmapped channel)")
        Dissector.get("data"):call(buffer(16):tvb(),info,root)
    end
end
