-- This file is generated by tools/json2lua.js

local ffxiv_ipc_actor_move = Proto("ffxiv_ipc_actor_move", "FFXIV-IPC Actor Move")

local actor_move_fields = {
  head_rotation    = ProtoField.uint8("ffxiv_ipc_actor_move.head_rotation", "headRotation", base.DEC),
  rotation         = ProtoField.uint8("ffxiv_ipc_actor_move.rotation", "rotation", base.DEC),
  animation_type   = ProtoField.uint8("ffxiv_ipc_actor_move.animation_type", "animationType", base.DEC),
  animation_state  = ProtoField.uint8("ffxiv_ipc_actor_move.animation_state", "animationState", base.DEC),
  animation_speed  = ProtoField.uint8("ffxiv_ipc_actor_move.animation_speed", "animationSpeed", base.DEC),
  unknown_rotation = ProtoField.uint8("ffxiv_ipc_actor_move.unknown_rotation", "unknownRotation", base.DEC),
  x                = ProtoField.uint16("ffxiv_ipc_actor_move.x", "X", base.DEC),
  y                = ProtoField.uint16("ffxiv_ipc_actor_move.y", "Y", base.DEC),
  z                = ProtoField.uint16("ffxiv_ipc_actor_move.z", "Z", base.DEC),
  unknown1         = ProtoField.uint32("ffxiv_ipc_actor_move.unknown1", "Unknown1", base.DEC),
}

ffxiv_ipc_actor_move.fields = actor_move_fields

function ffxiv_ipc_actor_move.dissector(tvbuf, pktinfo, root)
  local tree = root:add(ffxiv_ipc_actor_move, tvbuf)
  pktinfo.cols.info:set("Actor Move")

  -- dissect the head_rotation field
  local head_rotation_tvbr = tvbuf:range(0, 1)
  local head_rotation_val  = head_rotation_tvbr:le_uint()
  tree:add_le(actor_move_fields.head_rotation, head_rotation_tvbr, head_rotation_val)

  -- dissect the rotation field
  local rotation_tvbr = tvbuf:range(1, 1)
  local rotation_val  = rotation_tvbr:le_uint()
  tree:add_le(actor_move_fields.rotation, rotation_tvbr, rotation_val)

  -- dissect the animation_type field
  local animation_type_tvbr = tvbuf:range(2, 1)
  local animation_type_val  = animation_type_tvbr:le_uint()
  tree:add_le(actor_move_fields.animation_type, animation_type_tvbr, animation_type_val)

  -- dissect the animation_state field
  local animation_state_tvbr = tvbuf:range(3, 1)
  local animation_state_val  = animation_state_tvbr:le_uint()
  tree:add_le(actor_move_fields.animation_state, animation_state_tvbr, animation_state_val)

  -- dissect the animation_speed field
  local animation_speed_tvbr = tvbuf:range(4, 1)
  local animation_speed_val  = animation_speed_tvbr:le_uint()
  tree:add_le(actor_move_fields.animation_speed, animation_speed_tvbr, animation_speed_val)

  -- dissect the unknown_rotation field
  local unknown_rotation_tvbr = tvbuf:range(5, 1)
  local unknown_rotation_val  = unknown_rotation_tvbr:le_uint()
  tree:add_le(actor_move_fields.unknown_rotation, unknown_rotation_tvbr, unknown_rotation_val)

  -- dissect the x field
  local x_tvbr = tvbuf:range(6, 2)
  local x_val  = x_tvbr:le_uint()
  tree:add_le(actor_move_fields.x, x_tvbr, x_val)

  -- dissect the y field
  local y_tvbr = tvbuf:range(8, 2)
  local y_val  = y_tvbr:le_uint()
  tree:add_le(actor_move_fields.y, y_tvbr, y_val)

  -- dissect the z field
  local z_tvbr = tvbuf:range(10, 2)
  local z_val  = z_tvbr:le_uint()
  tree:add_le(actor_move_fields.z, z_tvbr, z_val)

  -- dissect the unknown1 field
  local unknown1_tvbr = tvbuf:range(12, 4)
  local unknown1_val  = unknown1_tvbr:le_uint()
  tree:add_le(actor_move_fields.unknown1, unknown1_tvbr, unknown1_val)

  return tvbuf:len()
end