-- This file is generated by tools/json2lua.js

local ffxiv_ipc_effect_result = Proto("ffxiv_ipc_effect_result", "FFXIV-IPC Effect Result")

local effect_result_fields = {
  last_buff_packet_id    = ProtoField.uint32("ffxiv_ipc_effect_result.last_buff_packet_id", "LastBuffPacketID", base.DEC),
  user_id                = ProtoField.uint32("ffxiv_ipc_effect_result.user_id", "UserID", base.DEC),
  current_hp             = ProtoField.uint32("ffxiv_ipc_effect_result.current_hp", "CurrentHp", base.DEC),
  max_hp                 = ProtoField.uint32("ffxiv_ipc_effect_result.max_hp", "MaxHp", base.DEC),
  current_mp             = ProtoField.uint16("ffxiv_ipc_effect_result.current_mp", "CurrentMP", base.DEC),
  current_tp             = ProtoField.uint16("ffxiv_ipc_effect_result.current_tp", "CurrentTP", base.DEC),
  damage_shield          = ProtoField.uint8("ffxiv_ipc_effect_result.damage_shield", "DamageShield", base.DEC),
  count                  = ProtoField.uint8("ffxiv_ipc_effect_result.count", "Count", base.DEC),
  unknown3               = ProtoField.uint8("ffxiv_ipc_effect_result.unknown3", "Unknown3", base.DEC),
  unknown4               = ProtoField.uint16("ffxiv_ipc_effect_result.unknown4", "Unknown4", base.DEC),
}

ffxiv_ipc_effect_result.fields = effect_result_fields

function ffxiv_ipc_effect_result.dissector(tvbuf, pktinfo, root)
  local tree = root:add(ffxiv_ipc_effect_result, tvbuf)
  pktinfo.cols.info:set("Effect Result")

  local len = tvbuf:len()

  -- dissect the last_buff_packet_id field
  local last_buff_packet_id_tvbr = tvbuf:range(0, 4)
  local last_buff_packet_id_val  = last_buff_packet_id_tvbr:le_uint()
  tree:add_le(effect_result_fields.last_buff_packet_id, last_buff_packet_id_tvbr, last_buff_packet_id_val)

  -- dissect the user_id field
  local user_id_tvbr = tvbuf:range(4, 4)
  local user_id_val  = user_id_tvbr:le_uint()
  tree:add_le(effect_result_fields.user_id, user_id_tvbr, user_id_val)

  -- dissect the current_hp field
  local current_hp_tvbr = tvbuf:range(8, 4)
  local current_hp_val  = current_hp_tvbr:le_uint()
  tree:add_le(effect_result_fields.current_hp, current_hp_tvbr, current_hp_val)

  -- dissect the max_hp field
  local max_hp_tvbr = tvbuf:range(12, 4)
  local max_hp_val  = max_hp_tvbr:le_uint()
  tree:add_le(effect_result_fields.max_hp, max_hp_tvbr, max_hp_val)

  -- dissect the current_mp field
  local current_mp_tvbr = tvbuf:range(16, 2)
  local current_mp_val  = current_mp_tvbr:le_uint()
  tree:add_le(effect_result_fields.current_mp, current_mp_tvbr, current_mp_val)

  -- dissect the current_tp field
  local current_tp_tvbr = tvbuf:range(18, 2)
  local current_tp_val  = current_tp_tvbr:le_uint()
  tree:add_le(effect_result_fields.current_tp, current_tp_tvbr, current_tp_val)

  -- dissect the damage_shield field
  local damage_shield_tvbr = tvbuf:range(20, 1)
  local damage_shield_val  = damage_shield_tvbr:le_uint()
  tree:add_le(effect_result_fields.damage_shield, damage_shield_tvbr, damage_shield_val)

  -- dissect the count field
  local count_tvbr = tvbuf:range(21, 1)
  local count_val  = count_tvbr:le_uint()
  tree:add_le(effect_result_fields.count, count_tvbr, count_val)

  -- dissect the unknown3 field
  local unknown3_tvbr = tvbuf:range(22, 1)
  local unknown3_val  = unknown3_tvbr:le_uint()
  tree:add_le(effect_result_fields.unknown3, unknown3_tvbr, unknown3_val)

  -- dissect the unknown4 field
  local unknown4_tvbr = tvbuf:range(24, 2)
  local unknown4_val  = unknown4_tvbr:le_uint()
  tree:add_le(effect_result_fields.unknown4, unknown4_tvbr, unknown4_val)

  -- dissect add_status_effect_item
  local add_status_effect_item_dissector = Dissector.get('ffxiv_ipc_add_status_effect_item')
  local add_status_effect_item_pos = 26
  local add_status_effect_item_len = 16
  local add_status_effect_item_count = count_val

  while add_status_effect_item_pos + add_status_effect_item_len <= len do
    local add_status_effect_item_tvbr = tvbuf:range(add_status_effect_item_pos, 16)
    add_status_effect_item_dissector:call(add_status_effect_item_tvbr:tvb(), pktinfo, root)
    add_status_effect_item_pos = add_status_effect_item_pos + add_status_effect_item_len
    add_status_effect_item_count = add_status_effect_item_count - 1
    if add_status_effect_item_count <= 0 then
      break
    end
  end

  return len
end