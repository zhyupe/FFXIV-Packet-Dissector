local ffxiv_segment = Proto("ffxiv_segment", "FFXIV Segment")

local function makeValString(enumTable)
  local t = {}
  for name,num in pairs(enumTable) do
      t[num] = name
  end
  return t
end

local segment_type = {
  IPC = 3,
  ClientKeepAlive = 7,
  ServerKeepAlive = 8,
}
local segment_type_valstr = makeValString(segment_type)

local segment_hdr_fields =
{
    size    = ProtoField.uint32("ffxiv_segment.size", "Size", base.DEC),
    source  = ProtoField.uint32("ffxiv_segment.source", "Source", base.HEX),
    target  = ProtoField.uint32("ffxiv_segment.target", "Target", base.HEX),
    type    = ProtoField.uint16("ffxiv_segment.type", "Type", base.DEC, segment_type_valstr),
    unknown = ProtoField.uint16("ffxiv_segment.unknown", "Unknown", base.HEX),
}

ffxiv_segment.fields = segment_hdr_fields

local FFXIV_SEGMENT_HDR_LEN = 16

-- some forward "declarations" of helper functions we use in the dissector
local dissectSegment, checkSegmentLength

-- this holds the plain "data" Dissector, in case we can't dissect it as Netlink
local data = Dissector.get("data")


--------------------------------------------------------------------------------
-- The following creates the callback function for the dissector.
-- It's the same as doing "ffxiv_segment.dissector = function (tvbuf,pkt,root)"
-- The 'tvbuf' is a Tvb object, 'pktinfo' is a Pinfo object, and 'root' is a TreeItem object.
-- Whenever Wireshark dissects a packet that our Proto is hooked into, it will call
-- this function and pass it these arguments for the packet it's dissecting.
function ffxiv_segment.dissector(tvbuf, pktinfo, root)
  -- get the length of the packet buffer (Tvb).
  local pktlen = tvbuf:len()
  local bytes_consumed = 0

  while bytes_consumed < pktlen do
      local result = dissectSegment(tvbuf, pktinfo, root, bytes_consumed)

      if result > 0 then
          bytes_consumed = bytes_consumed + result
      else
          return 0
      end        
  end

  return bytes_consumed
end

dissectSegment = function (tvbuf, pktinfo, root, offset)
  -- length_val is the total length of the bundle
  local tree = root:add(ffxiv_segment, tvbuf:range(offset, FFXIV_SEGMENT_HDR_LEN))

  -- dissect the size field
  local size_tvbr = tvbuf:range(offset, 4)
  local size_val  = size_tvbr:le_uint()
  tree:add_le(segment_hdr_fields.size, size_tvbr)

  -- dissect the source field
  local source_tvbr = tvbuf:range(offset + 4, 4)
  local source_val  = source_tvbr:le_uint()
  tree:append_text(", Src: " .. string.format('%08x', source_val))
  tree:add_le(segment_hdr_fields.source, source_tvbr)

  -- dissect the target field
  local target_tvbr = tvbuf:range(offset + 8, 4)
  local target_val  = target_tvbr:le_uint()
  tree:append_text(", Dst: " .. string.format('%08x', target_val))
  tree:add_le(segment_hdr_fields.target, target_tvbr)

  -- dissect the type field
  local type_tvbr = tvbuf:range(offset + 12, 2)
  local type_val  = type_tvbr:le_uint()
  tree:append_text(", Type: " .. type_val)
  tree:add_le(segment_hdr_fields.type, type_tvbr)

  -- dissect the unknown field
  local unknown_tvbr = tvbuf:range(offset + 14, 2)
  local unknown_val  = unknown_tvbr:le_uint()
  tree:add_le(segment_hdr_fields.unknown, unknown_tvbr)

  local data_tvbr = tvbuf:range(offset + FFXIV_SEGMENT_HDR_LEN, size_val - FFXIV_SEGMENT_HDR_LEN)

  local header_length = 16;

  -- set the protocol column to show our protocol name
  pktinfo.cols.protocol:set("FFXIV")

  if string.find(tostring(pktinfo.cols.info), "^FFXIV-SEGMENT") == nil then
      pktinfo.cols.info:set("FFXIV-SEGMENT")
  end


  local tvb = data_tvbr:tvb()
  if type_val == segment_type.IPC then
    Dissector.get('ffxiv_ipc'):call(tvb, pktinfo, root)
  elseif type_val == segment_type.ClientKeepAlive then
    Dissector.get('ffxiv_client_keep_alive'):call(tvb, pktinfo, root)
  elseif type_val == segment_type.ServerKeepAlive then
    Dissector.get('ffxiv_server_keep_alive'):call(tvb, pktinfo, root)
  else
    pktinfo.cols.info:append(": Unknown")
    data:call(tvb, pktinfo, root)
  end

  return size_val
end
