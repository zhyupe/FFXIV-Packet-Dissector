-- This file is generated by tools/json2lua.js

local db = require('ffxiv_db')
local ffxiv_ipc_add_status_effect_item = Proto("ffxiv_ipc_add_status_effect_item", "FFXIV-IPC AddStatusEffectItem")

local add_status_effect_item_fields = {
  status       = ProtoField.uint16("ffxiv_ipc_add_status_effect_item.status", "Status", base.DEC, db.Status),
  status_extra = ProtoField.uint16("ffxiv_ipc_add_status_effect_item.status_extra", "StatusExtra", base.DEC),
  unknown1     = ProtoField.uint16("ffxiv_ipc_add_status_effect_item.unknown1", "Unknown1", base.DEC),
  duration     = ProtoField.float("ffxiv_ipc_add_status_effect_item.duration", "Duration", base.DEC),
  actor_id     = ProtoField.uint32("ffxiv_ipc_add_status_effect_item.actor_id", "ActorID", base.HEX),
  unknown2     = ProtoField.uint16("ffxiv_ipc_add_status_effect_item.unknown2", "Unknown2", base.DEC),
}

ffxiv_ipc_add_status_effect_item.fields = add_status_effect_item_fields

function ffxiv_ipc_add_status_effect_item.dissector(tvbuf, pktinfo, root)
  local tree = root:add(ffxiv_ipc_add_status_effect_item, tvbuf)
  pktinfo.cols.info:set("AddStatusEffectItem")

  local len = tvbuf:len()

  -- dissect the status field
  local status_tvbr = tvbuf:range(0, 2)
  local status_val  = status_tvbr:le_uint()
  tree:add_le(add_status_effect_item_fields.status, status_tvbr, status_val)

  local status_display = ", Status: " .. (db.Status[status_val] or "(unknown)")
  pktinfo.cols.info:append(status_display)
  tree:append_text(status_display)

  -- dissect the status_extra field
  local status_extra_tvbr = tvbuf:range(2, 2)
  local status_extra_val  = status_extra_tvbr:le_uint()
  tree:add_le(add_status_effect_item_fields.status_extra, status_extra_tvbr, status_extra_val)

  -- dissect the unknown1 field
  local unknown1_tvbr = tvbuf:range(4, 2)
  local unknown1_val  = unknown1_tvbr:le_uint()
  tree:add_le(add_status_effect_item_fields.unknown1, unknown1_tvbr, unknown1_val)

  -- dissect the duration field
  local duration_tvbr = tvbuf:range(6, 4)
  local duration_val  = duration_tvbr:le_float()
  tree:add_le(add_status_effect_item_fields.duration, duration_tvbr, duration_val)

  -- dissect the actor_id field
  local actor_id_tvbr = tvbuf:range(10, 4)
  local actor_id_val  = actor_id_tvbr:le_uint()
  tree:add_le(add_status_effect_item_fields.actor_id, actor_id_tvbr, actor_id_val)

  -- dissect the unknown2 field
  local unknown2_tvbr = tvbuf:range(14, 2)
  local unknown2_val  = unknown2_tvbr:le_uint()
  tree:add_le(add_status_effect_item_fields.unknown2, unknown2_tvbr, unknown2_val)

  return len
end