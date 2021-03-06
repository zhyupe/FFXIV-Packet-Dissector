-- This file is generated by tools/json2lua.js

local ffxiv_ipc_faux_hollow_status = Proto("ffxiv_ipc_faux_hollow_status", "FFXIV-IPC Faux Hollow Status")

local faux_hollow_status_fields = {
  unknown1          = ProtoField.uint32("ffxiv_ipc_faux_hollow_status.unknown1", "Unknown1", base.DEC),
  unknown1          = ProtoField.uint32("ffxiv_ipc_faux_hollow_status.unknown1", "Unknown1", base.DEC),
  unknown2          = ProtoField.uint32("ffxiv_ipc_faux_hollow_status.unknown2", "Unknown2", base.DEC),
  value             = ProtoField.uint32("ffxiv_ipc_faux_hollow_status.value", "Value", base.DEC),
  column            = ProtoField.uint32("ffxiv_ipc_faux_hollow_status.column", "Column", base.DEC),
  unknown3          = ProtoField.uint32("ffxiv_ipc_faux_hollow_status.unknown3", "unknown3", base.DEC),
  chance            = ProtoField.uint32("ffxiv_ipc_faux_hollow_status.chance", "Chance", base.DEC),
  unknown_status1   = ProtoField.uint32("ffxiv_ipc_faux_hollow_status.unknown_status1", "UnknownStatus1", base.DEC),
  unknown_status2   = ProtoField.uint32("ffxiv_ipc_faux_hollow_status.unknown_status2", "UnknownStatus2", base.DEC),
  timestamp         = ProtoField.uint64("ffxiv_ipc_faux_hollow_status.timestamp", "Timestamp", base.DEC),
}

ffxiv_ipc_faux_hollow_status.fields = faux_hollow_status_fields

function ffxiv_ipc_faux_hollow_status.dissector(tvbuf, pktinfo, root)
  local tree = root:add(ffxiv_ipc_faux_hollow_status, tvbuf)
  pktinfo.cols.info:set("Faux Hollow Status")

  local len = tvbuf:len()

  -- dissect the unknown1 field
  local unknown1_tvbr = tvbuf:range(0, 4)
  local unknown1_val  = unknown1_tvbr:le_uint()
  tree:add_le(faux_hollow_status_fields.unknown1, unknown1_tvbr, unknown1_val)

  -- dissect the unknown1 field
  local unknown1_tvbr = tvbuf:range(4, 4)
  local unknown1_val  = unknown1_tvbr:le_uint()
  tree:add_le(faux_hollow_status_fields.unknown1, unknown1_tvbr, unknown1_val)

  -- dissect the unknown2 field
  local unknown2_tvbr = tvbuf:range(8, 4)
  local unknown2_val  = unknown2_tvbr:le_uint()
  tree:add_le(faux_hollow_status_fields.unknown2, unknown2_tvbr, unknown2_val)

  -- dissect the value field
  local value_tvbr = tvbuf:range(12, 4)
  local value_val  = value_tvbr:le_uint()
  tree:add_le(faux_hollow_status_fields.value, value_tvbr, value_val)

  local value_display = ", Value: " .. value_val
  pktinfo.cols.info:append(value_display)
  tree:append_text(value_display)

  -- dissect the column field
  local column_tvbr = tvbuf:range(16, 4)
  local column_val  = column_tvbr:le_uint()
  tree:add_le(faux_hollow_status_fields.column, column_tvbr, column_val)

  -- dissect the unknown3 field
  local unknown3_tvbr = tvbuf:range(20, 4)
  local unknown3_val  = unknown3_tvbr:le_uint()
  tree:add_le(faux_hollow_status_fields.unknown3, unknown3_tvbr, unknown3_val)

  -- dissect the chance field
  local chance_tvbr = tvbuf:range(48, 4)
  local chance_val  = chance_tvbr:le_uint()
  tree:add_le(faux_hollow_status_fields.chance, chance_tvbr, chance_val)

  local chance_display = ", Chance: " .. chance_val
  pktinfo.cols.info:append(chance_display)
  tree:append_text(chance_display)

  -- dissect the unknown_status1 field
  local unknown_status1_tvbr = tvbuf:range(52, 4)
  local unknown_status1_val  = unknown_status1_tvbr:le_uint()
  tree:add_le(faux_hollow_status_fields.unknown_status1, unknown_status1_tvbr, unknown_status1_val)

  -- dissect the unknown_status2 field
  local unknown_status2_tvbr = tvbuf:range(56, 4)
  local unknown_status2_val  = unknown_status2_tvbr:le_uint()
  tree:add_le(faux_hollow_status_fields.unknown_status2, unknown_status2_tvbr, unknown_status2_val)

  -- dissect faux_hollow_block
  local faux_hollow_block_dissector = Dissector.get('ffxiv_ipc_faux_hollow_block')
  local faux_hollow_block_pos = 60
  local faux_hollow_block_len = 8
  local faux_hollow_block_count = 4

  while faux_hollow_block_pos + faux_hollow_block_len <= len do
    local faux_hollow_block_tvbr = tvbuf:range(faux_hollow_block_pos, 8)
    faux_hollow_block_dissector:call(faux_hollow_block_tvbr:tvb(), pktinfo, root)
    faux_hollow_block_pos = faux_hollow_block_pos + faux_hollow_block_len
    faux_hollow_block_count = faux_hollow_block_count - 1
    if faux_hollow_block_count <= 0 then
      break
    end
  end

  -- dissect faux_hollow_block
  local faux_hollow_block_dissector = Dissector.get('ffxiv_ipc_faux_hollow_block')
  local faux_hollow_block_pos = 96
  local faux_hollow_block_len = 8
  local faux_hollow_block_count = 4

  while faux_hollow_block_pos + faux_hollow_block_len <= len do
    local faux_hollow_block_tvbr = tvbuf:range(faux_hollow_block_pos, 8)
    faux_hollow_block_dissector:call(faux_hollow_block_tvbr:tvb(), pktinfo, root)
    faux_hollow_block_pos = faux_hollow_block_pos + faux_hollow_block_len
    faux_hollow_block_count = faux_hollow_block_count - 1
    if faux_hollow_block_count <= 0 then
      break
    end
  end

  -- dissect the timestamp field
  local timestamp_tvbr = tvbuf:range(136, 8)
  local timestamp_val  = timestamp_tvbr:le_uint64()
  tree:add_le(faux_hollow_status_fields.timestamp, timestamp_tvbr, timestamp_val)

  return len
end