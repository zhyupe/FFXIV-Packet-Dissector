-- This file is generated by tools/json2lua.js

local M = {}
M.types = {
  [0x010A] = {
    [0] = {
      name = "ffxiv_ipc_actor_cast",
      length = 32,
    },
  },
  [0x00F6] = {
    [0] = {
      name = "ffxiv_ipc_actor_control",
      length = 24,
    },
  },
  [0x0325] = {
    [0] = {
      name = "ffxiv_ipc_actor_control_self",
      length = 32,
    },
  },
  [0x0309] = {
    [0] = {
      name = "ffxiv_ipc_actor_control_target",
      length = 32,
    },
  },
  [0x0333] = {
    [0] = {
      name = "ffxiv_ipc_actor_gauge",
      length = 16,
    },
  },
  [0x02AA] = {
    [0] = {
      name = "ffxiv_ipc_actor_move",
      length = 16,
    },
  },
  [0x007D] = {
    [0] = {
      name = "ffxiv_ipc_actor_set_pos",
      length = 24,
    },
  },
  [0x01E8] = {
    [0] = {
      name = "ffxiv_ipc_effect16",
      length = 1212,
    },
  },
  [0x008D] = {
    [0] = {
      name = "ffxiv_ipc_effect24",
      length = 1788,
    },
  },
  [0x0392] = {
    [0] = {
      name = "ffxiv_ipc_effect32",
      length = 2364,
    },
  },
  [0x0175] = {
    [0] = {
      name = "ffxiv_ipc_effect8",
      length = 636,
    },
  },
  [0x025D] = {
    [0] = {
      name = "ffxiv_ipc_cedirector",
      length = 16,
    },
  },
  [0x0315] = {
    [0] = {
      name = "ffxiv_ipc_client_trigger",
      length = 32,
    },
  },
  [0x0197] = {
    [0] = {
      name = "ffxiv_ipc_company_airship_status",
      length = 0,
    },
  },
  [0x0169] = {
    [0] = {
      name = "ffxiv_ipc_company_submersible_status",
      length = 0,
    },
  },
  [0x00D0] = {
    [0] = {
      name = "ffxiv_ipc_container_info",
      length = 16,
    },
  },
  [0x0336] = {
    [0] = {
      name = "ffxiv_ipc_content_finder_notify_pop",
      length = 32,
    },
  },
  [0x01F9] = {
    [0] = {
      name = "ffxiv_ipc_currency_crystal_info",
      length = 32,
    },
  },
  [0x018F] = {
    [0] = {
      name = "ffxiv_ipc_effect",
      length = 124,
    },
  },
  [0x02A6] = {
    [0] = {
      name = "ffxiv_ipc_effect_result",
      length = 26,
    },
  },
  [0x0372] = {
    [0] = {
      name = "ffxiv_ipc_examine",
      length = 656,
    },
  },
  [0x03E1] = {
    [0] = {
      name = "ffxiv_ipc_init_zone",
      length = 96,
    },
  },
  [0x03B3] = {
    [0] = {
      name = "ffxiv_ipc_inventory_action_ack",
      length = 16,
    },
  },
  [0x03E0] = {
    [0] = {
      name = "ffxiv_ipc_inventory_transaction",
      length = 36,
    },
  },
  [0x019B] = {
    [0] = {
      name = "ffxiv_ipc_inventory_transaction_finish",
      length = 16,
    },
  },
  [0x031A] = {
    [0] = {
      name = "ffxiv_ipc_npc_spawn",
      length = 636,
    },
  },
  [0x030C] = {
    [0] = {
      name = "ffxiv_ipc_object_spawn",
      length = 64,
    },
  },
  [0x014C] = {
    [0] = {
      name = "ffxiv_ipc_player_spawn",
      length = 628,
    },
  },
  [0x013B] = {
    [0] = {
      name = "ffxiv_ipc_player_stats",
      length = 224,
    },
  },
  [0x01DA] = {
    [0] = {
      name = "ffxiv_ipc_retainer_information",
      length = 73,
    },
  },
  [0x03B5] = {
    [0] = {
      name = "ffxiv_ipc_status_effect_list",
      length = 384,
    },
  },
  [0x02C1] = {
    [0] = {
      name = "ffxiv_ipc_update_class_info",
      length = 16,
    },
  },
  [0x0367] = {
    [0] = {
      name = "ffxiv_ipc_update_hp_mp_tp",
      length = 8,
    },
  },
  [0x0093] = {
    [0] = {
      name = "ffxiv_ipc_update_inventory_slot",
      length = 64,
    },
  },
  [0x035D] = {
    [0] = {
      name = "ffxiv_ipc_item_info",
      length = 64,
    },
  },
  [0x01B0] = {
    [0] = {
      name = "ffxiv_ipc_update_position_instance",
      length = 40,
    },
  },
  [0x00C0] = {
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