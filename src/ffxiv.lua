local ffxiv_proto = Proto("ffxiv", "FFXIV Bundle")
local MAX_PACKET_LENGTH = 4096

local function makeValString(enumTable)
  local t = {}
  for name,num in pairs(enumTable) do
      t[num] = name
  end
  return t
end

local msgtype = {
  NONE     = 0,
  NETLINK  = 1,
}
local msgtype_valstr = makeValString(msgtype)

local bundle_hdr_fields =
{
    magic0     = ProtoField.uint32("ffxiv.magic0", "Magic 0", base.HEX),
    magic1     = ProtoField.uint32("ffxiv.magic1", "Magic 1", base.HEX),
    magic2     = ProtoField.uint32("ffxiv.magic2", "Magic 2", base.HEX),
    magic3     = ProtoField.uint32("ffxiv.magic3", "Magic 3", base.HEX),
    epoch      = ProtoField.uint64("ffxiv.epoch", "Epoch", base.DEC),
    bundle_len = ProtoField.uint16("ffxiv.bundle_len", "Length", base.DEC),
    unknown1   = ProtoField.uint16("ffxiv.unknown1", "Unknown1", base.HEX),
    conn_type  = ProtoField.uint16("ffxiv.conn_type", "Connection Type", base.HEX),
    msg_count  = ProtoField.uint16("ffxiv.msg_count", "Message Count", base.DEC),
    encoding   = ProtoField.uint8("ffxiv.encoding", "Encoding", base.HEX),
    compressed = ProtoField.uint8("ffxiv.compressed", "Compressed", base.DEC),
    unknown3   = ProtoField.uint16("ffxiv.unknown3", "unknown3", base.HEX),
    unknown4   = ProtoField.uint16("ffxiv.unknown4", "unknown4", base.HEX),
    unknown5   = ProtoField.uint16("ffxiv.unknown5", "unknown5", base.HEX),
    data       = ProtoField.bytes("ffxiv.data", "Bundle Data", base.NONE),
}

ffxiv_proto.fields = bundle_hdr_fields

local FFXIV_BUNDLE_HDR_LEN = 40

-- some forward "declarations" of helper functions we use in the dissector
local dissectBundle, checkBundleLength

function ffxiv_proto.dissector(tvbuf, pktinfo, root)
  -- get the length of the packet buffer (Tvb).
  local pktlen = tvbuf:len()
  local bytes_consumed = 0

  while bytes_consumed < pktlen do
      local result = dissectBundle(tvbuf, pktinfo, root, bytes_consumed)

      print('ffxiv_bundle', bytes_consumed, result, pktlen)
      if result > 0 then
          -- we successfully processed an FPM message, of 'result' length
          bytes_consumed = bytes_consumed + result
          -- go again on another while loop
      elseif result == 0 then
          -- If the result is 0, then it means we hit an error of some kind,
          -- so return 0. Returning 0 tells Wireshark this packet is not for
          -- us, and it will try heuristic dissectors or the plain "data"
          -- one, which is what should happen in this case.
          return 0
      else
          -- we need more bytes, so set the desegment_offset to what we
          -- already consumed, and the desegment_len to how many more
          -- are needed
          pktinfo.desegment_offset = bytes_consumed

          -- invert the negative result so it's a positive number
          result = -result

          pktinfo.desegment_len = result

          -- even though we need more bytes, this packet is for us, so we
          -- tell wireshark all of its bytes are for us by returning the
          -- number of Tvb bytes we "successfully processed", namely the
          -- length of the Tvb
          return pktlen
      end        
  end

  return bytes_consumed
end

dissectBundle = function (tvbuf, pktinfo, root, offset)
  local length_val, length_tvbr = checkBundleLength(tvbuf, offset)

  if length_val <= 0 then
      return length_val
  end

  -- length_val is the total length of the bundle
  local tree = root:add(ffxiv_proto, tvbuf:range(offset, length_val))

  -- dissect the magic0 field
  local magic0_tvbr = tvbuf:range(offset, 4)
  local magic0_val  = magic0_tvbr:le_uint()
  tree:add_le(bundle_hdr_fields.magic0, magic0_tvbr)

  -- dissect the magic1 field
  local magic1_tvbr = tvbuf:range(offset + 4, 4)
  local magic1_val  = magic1_tvbr:le_uint()
  tree:add_le(bundle_hdr_fields.magic1, magic1_tvbr)

  -- dissect the magic2 field
  local magic2_tvbr = tvbuf:range(offset + 8, 4)
  local magic2_val  = magic2_tvbr:le_uint()
  tree:add_le(bundle_hdr_fields.magic2, magic2_tvbr)

  -- dissect the magic3 field
  local magic3_tvbr = tvbuf:range(offset + 12, 4)
  local magic3_val  = magic3_tvbr:le_uint()
  tree:add_le(bundle_hdr_fields.magic3, magic3_tvbr)

  -- dissect the epoch field
  local epoch_tvbr = tvbuf:range(offset + 16, 8)
  local epoch_val  = epoch_tvbr:le_uint64()
  tree:add_le(bundle_hdr_fields.epoch, epoch_tvbr)

  -- dissect the bundle_len field
  local bundle_len_tvbr = tvbuf:range(offset + 24, 2)
  local bundle_len_val  = bundle_len_tvbr:le_uint()
  tree:add_le(bundle_hdr_fields.bundle_len, bundle_len_tvbr)

  -- dissect the unknown1 field
  local unknown1_tvbr = tvbuf:range(offset + 26, 2)
  local unknown1_val  = unknown1_tvbr:le_uint()
  tree:add_le(bundle_hdr_fields.unknown1, unknown1_tvbr)

  -- dissect the conn_type field
  local conn_type_tvbr = tvbuf:range(offset + 28, 2)
  local conn_type_val  = conn_type_tvbr:le_uint()
  tree:append_text(", ConnType: " .. conn_type_val)
  tree:add_le(bundle_hdr_fields.conn_type, conn_type_tvbr)

  -- dissect the msg_count field
  local msg_count_tvbr = tvbuf:range(offset + 30, 2)
  local msg_count_val  = msg_count_tvbr:le_uint()
  tree:add_le(bundle_hdr_fields.msg_count, msg_count_tvbr)

  -- dissect the encoding field
  local encoding_tvbr = tvbuf:range(offset + 32, 1)
  local encoding_val  = encoding_tvbr:le_uint()
  tree:append_text(", Encoding: " .. encoding_val)
  tree:add_le(bundle_hdr_fields.encoding, encoding_tvbr)

  -- dissect the compressed field
  local compressed_tvbr = tvbuf:range(offset + 33, 1)
  local compressed_val  = compressed_tvbr:le_uint()
  if compressed_val == 1 then
    tree:append_text(", Compressed")
  end
  tree:add_le(bundle_hdr_fields.compressed, compressed_tvbr)

  -- dissect the unknown3 field
  local unknown3_tvbr = tvbuf:range(offset + 34, 2)
  local unknown3_val  = unknown3_tvbr:le_uint()
  tree:add_le(bundle_hdr_fields.unknown3, unknown3_tvbr)

  -- dissect the unknown4 field
  local unknown4_tvbr = tvbuf:range(offset + 36, 2)
  local unknown4_val  = unknown4_tvbr:le_uint()
  tree:add_le(bundle_hdr_fields.unknown4, unknown4_tvbr)

  -- dissect the unknown5 field
  local unknown5_tvbr = tvbuf:range(offset + 38, 2)
  local unknown5_val  = unknown5_tvbr:le_uint()
  tree:add_le(bundle_hdr_fields.unknown5, unknown5_tvbr)

  local data_tvbr = tvbuf:range(offset + FFXIV_BUNDLE_HDR_LEN, length_val - FFXIV_BUNDLE_HDR_LEN)
  if compressed_val == 1 then
    data_tvbr = data_tvbr:uncompress('SegementData')
  end
  tree:add(bundle_hdr_fields.data, data_tvbr)
  
  pktinfo.cols.protocol:set("FFXIV")
  if string.find(tostring(pktinfo.cols.info), "^FFXIV") == nil then
    pktinfo.cols.info:set("FFXIV")
  end

  Dissector.get('ffxiv_segment'):call(data_tvbr:tvb(), pktinfo, root)
  return bundle_len_val
end


----------------------------------------
-- The function to check the length field.
--
-- This returns two things: (1) the length, and (2) the TvbRange object, which
-- might be nil if length <= 0.
checkBundleLength = function (tvbuf, offset)

  -- "msglen" is the number of bytes remaining in the Tvb buffer which we
  -- have available to dissect in this run
  local msglen = tvbuf:len() - offset

  -- check if capture was only capturing partial packet size
  if msglen ~= tvbuf:reported_length_remaining(offset) then
      -- captured packets are being sliced/cut-off, so don't try to desegment/reassemble
      return 0
  end

  if msglen < FFXIV_BUNDLE_HDR_LEN then
      -- we need more bytes, so tell the main dissector function that we
      -- didn't dissect anything, and we need an unknown number of more
      -- bytes (which is what "DESEGMENT_ONE_MORE_SEGMENT" is used for)
      -- return as a negative number
      return -DESEGMENT_ONE_MORE_SEGMENT
  end

  -- if we got here, then we know we have enough bytes in the Tvb buffer
  -- to at least figure out the full length of this FPM messsage (the length
  -- is the 16-bit integer in third and fourth bytes)

  -- get the TvbRange of bytes 3+4
  local length_tvbr = tvbuf:range(offset + 24, 2)
  local length_val  = length_tvbr:le_uint()

  if length_val > MAX_PACKET_LENGTH then
      -- too many bytes, invalid message
      return 0
  end

  if msglen < length_val then
      -- we need more bytes to get the whole FPM message
      return -(length_val - msglen)
  end

  return length_val, length_tvbr
end

local function heur_dissect_ffxiv(tvbuf, pktinfo, root)
  if tvbuf:len() < FFXIV_BUNDLE_HDR_LEN then
    return false
  end

  local magic1 = tvbuf:range(0,4):le_uint()
  local magic2 = tvbuf:range(4,4):le_uint()
  local magic3 = tvbuf:range(8,4):le_uint()
  local magic4 = tvbuf:range(12,4):le_uint()
  if magic1 ~= 0x41a05252 and not (magic1 == 0 and magic2 == 0 and magic3 == 0 and magic4 == 0) then
    return false
  end

  ffxiv_proto.dissector(tvbuf, pktinfo, root)
  pktinfo.conversation = ffxiv_proto

  return true
end

ffxiv_proto:register_heuristic("tcp", heur_dissect_ffxiv)
