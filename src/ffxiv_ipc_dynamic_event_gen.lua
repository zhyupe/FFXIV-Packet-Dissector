-- This file is generated by tools/json2lua.js

local db = require('ffxiv_db')
local ffxiv_ipc_dynamic_event = Proto("ffxiv_ipc_dynamic_event", "FFXIV-IPC Dynamic Event")

local dynamic_event_fields = {
  time_start     = ProtoField.uint32("ffxiv_ipc_dynamic_event.time_start", "timeStart", base.DEC),
  time_remaining = ProtoField.uint32("ffxiv_ipc_dynamic_event.time_remaining", "timeRemaining", base.DEC),
  event          = ProtoField.uint8("ffxiv_ipc_dynamic_event.event", "event", base.DEC, db.DynamicEvent),
  players        = ProtoField.uint8("ffxiv_ipc_dynamic_event.players", "players", base.DEC),
  status         = ProtoField.uint16("ffxiv_ipc_dynamic_event.status", "status", base.DEC),
  progress       = ProtoField.uint32("ffxiv_ipc_dynamic_event.progress", "progress", base.DEC),
}

ffxiv_ipc_dynamic_event.fields = dynamic_event_fields

function ffxiv_ipc_dynamic_event.dissector(tvbuf, pktinfo, root)
  local tree = root:add(ffxiv_ipc_dynamic_event, tvbuf)
  pktinfo.cols.info:set("Dynamic Event")

  local len = tvbuf:len()

  -- dissect the time_start field
  local time_start_tvbr = tvbuf:range(0, 4)
  local time_start_val  = time_start_tvbr:le_uint()
  tree:add_le(dynamic_event_fields.time_start, time_start_tvbr, time_start_val)

  -- dissect the time_remaining field
  local time_remaining_tvbr = tvbuf:range(4, 4)
  local time_remaining_val  = time_remaining_tvbr:le_uint()
  tree:add_le(dynamic_event_fields.time_remaining, time_remaining_tvbr, time_remaining_val)

  -- dissect the event field
  local event_tvbr = tvbuf:range(8, 1)
  local event_val  = event_tvbr:le_uint()
  tree:add_le(dynamic_event_fields.event, event_tvbr, event_val)

  local event_display = ", event: " .. (db.DynamicEvent[event_val] or "(unknown)")
  pktinfo.cols.info:append(event_display)
  tree:append_text(event_display)

  -- dissect the players field
  local players_tvbr = tvbuf:range(9, 1)
  local players_val  = players_tvbr:le_uint()
  tree:add_le(dynamic_event_fields.players, players_tvbr, players_val)

  -- dissect the status field
  local status_tvbr = tvbuf:range(10, 2)
  local status_val  = status_tvbr:le_uint()
  tree:add_le(dynamic_event_fields.status, status_tvbr, status_val)

  -- dissect the progress field
  local progress_tvbr = tvbuf:range(12, 4)
  local progress_val  = progress_tvbr:le_uint()
  tree:add_le(dynamic_event_fields.progress, progress_tvbr, progress_val)

  return len
end