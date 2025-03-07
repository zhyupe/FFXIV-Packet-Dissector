-- This file is generated by tools/json2lua.js

local M = {}
M.types = {
  [0x01c9] = {
    [0] = {
      name = "ffxiv_ipc_actor_cast",
      length = 32,
    },
  },
  [0x02bf] = {
    [0] = {
      name = "ffxiv_ipc_actor_control",
      length = 24,
    },
  },
  [0x0119] = {
    [0] = {
      name = "ffxiv_ipc_actor_control_self",
      length = 32,
    },
  },
  [0x033b] = {
    [0] = {
      name = "ffxiv_ipc_actor_control_target",
      length = 32,
    },
  },
  [0x01cb] = {
    [0] = {
      name = "ffxiv_ipc_actor_gauge",
      length = 16,
    },
  },
  [0x0123] = {
    [0] = {
      name = "ffxiv_ipc_actor_move",
      length = 16,
    },
  },
  [0x02bc] = {
    [0] = {
      name = "ffxiv_ipc_actor_set_pos",
      length = 24,
    },
  },
  [0x0178] = {
    [0] = {
      name = "ffxiv_ipc_effect16",
      length = 1212,
    },
  },
  [0x0130] = {
    [0] = {
      name = "ffxiv_ipc_effect24",
      length = 1788,
    },
  },
  [0x019d] = {
    [0] = {
      name = "ffxiv_ipc_effect32",
      length = 2364,
    },
  },
  [0x00f7] = {
    [0] = {
      name = "ffxiv_ipc_effect8",
      length = 636,
    },
  },
  [0x3E6] = {
    [0] = {
      name = "ffxiv_ipc_boss_status_effect_list",
      length = 744,
    },
  },
  [0x36A] = {
    [0] = {
      name = "ffxiv_ipc_cedirector",
      length = 16,
    },
  },
  [0x031b] = {
    [0] = {
      name = "ffxiv_ipc_client_trigger",
      length = 32,
    },
  },
  [0x0291] = {
    [0] = {
      name = "ffxiv_ipc_company_airship_status",
      length = 0,
    },
  },
  [0x01b4] = {
    [0] = {
      name = "ffxiv_ipc_company_submersible_status",
      length = 0,
    },
  },
  [0x0362] = {
    [0] = {
      name = "ffxiv_ipc_container_info",
      length = 16,
    },
  },
  [0x01ad] = {
    [0] = {
      name = "ffxiv_ipc_content_finder_notify_pop",
      length = 32,
    },
  },
  [0x03c7] = {
    [0] = {
      name = "ffxiv_ipc_currency_crystal_info",
      length = 32,
    },
  },
  [0x0125] = {
    [0] = {
      name = "ffxiv_ipc_effect",
      length = 124,
    },
  },
  [0x028b] = {
    [0] = {
      name = "ffxiv_ipc_effect_result",
      length = 26,
    },
  },
  [0x02bd] = {
    [0] = {
      name = "ffxiv_ipc_examine",
      length = 656,
    },
  },
  [0x2B4] = {
    [0] = {
      name = "ffxiv_ipc_fate_info",
      length = 24,
    },
  },
  [0x0108] = {
    [0] = {
      name = "ffxiv_ipc_init_zone",
      length = 96,
    },
  },
  [0x012d] = {
    [0] = {
      name = "ffxiv_ipc_inventory_action_ack",
      length = 16,
    },
  },
  [0x0162] = {
    [0] = {
      name = "ffxiv_ipc_inventory_transaction",
      length = 36,
    },
  },
  [0x0398] = {
    [0] = {
      name = "ffxiv_ipc_inventory_transaction_finish",
      length = 16,
    },
  },
  [0x03bb] = {
    [0] = {
      name = "ffxiv_ipc_npc_spawn",
      length = 636,
    },
  },
  [0x02ad] = {
    [0] = {
      name = "ffxiv_ipc_object_spawn",
      length = 64,
    },
  },
  [0x01dd] = {
    [0] = {
      name = "ffxiv_ipc_player_spawn",
      length = 628,
    },
  },
  [0x027b] = {
    [0] = {
      name = "ffxiv_ipc_player_stats",
      length = 224,
    },
  },
  [0x02b2] = {
    [0] = {
      name = "ffxiv_ipc_retainer_information",
      length = 73,
    },
  },
  [0x0137] = {
    [0] = {
      name = "ffxiv_ipc_status_effect_list",
      length = 384,
    },
  },
  [0x01ae] = {
    [0] = {
      name = "ffxiv_ipc_update_class_info",
      length = 16,
    },
  },
  [0x0198] = {
    [0] = {
      name = "ffxiv_ipc_update_hp_mp_tp",
      length = 8,
    },
  },
  [0x010b] = {
    [0] = {
      name = "ffxiv_ipc_update_inventory_slot",
      length = 64,
    },
  },
  [0x03a9] = {
    [0] = {
      name = "ffxiv_ipc_item_info",
      length = 64,
    },
  },
  [0x03c5] = {
    [0] = {
      name = "ffxiv_ipc_update_position_instance",
      length = 40,
    },
  },
  [0x035a] = {
    [0] = {
      name = "ffxiv_ipc_ward_land_info",
      length = 8,
    },
  },
}

function M.getDissector(typeNum, length)
  local types = M.types[typeNum]
  if type(types) ~= "table" then
    return nil
  end

  for k, v in pairs(types) do
    if v.length == length then
      return Dissector.get(v.name)
    end
  end

  for k, v in pairs(types) do
    if v.length < length then
      return Dissector.get(v.name)
    end
  end

  return nil
end

return M
