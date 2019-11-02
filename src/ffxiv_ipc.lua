local ffxiv_ipc = Proto("ffxiv_ipc", "FFXIV IPC")

local function makeValString(enumTable)
  local t = {}
  for name,num in pairs(enumTable) do
      t[num] = name
  end
  return t
end

local ipc_type = {
  -- From Machina
  StatusEffectList = 0x0151,

  Ability1 = 0x0154,
  Ability8 = 0x0157,
  Ability16 = 0x0158,
  Ability24 = 0x0159,
  Ability32 = 0x015a,

  ActorCast = 0x017c,
  AddStatusEffect = 0x0141,
  ActorControl142 = 0x0142,
  ActorControl143 = 0x0143,
  ActorControl144 = 0x0144,
  ActorGauge = 0x029a,

  -- Analyzed
  PublicMessage = 0x00F7,
  GroupMessage = 0x0065,
  Announcement = 0x010C,
  CompanyBoard = 0x013F,
  StartCasting = 0x017C,
  ActorMove = 0x0178,
  ItemInit = 0x0196,
  ItemSimple = 0x019B,
  ItemChange = 0x019E,
}

local ipc_type_valstr = makeValString(ipc_type)
local ipc_hdr_fields =
{
    magic     = ProtoField.uint16("ffxiv_ipc.magic", "Magic", base.HEX),
    type      = ProtoField.uint16("ffxiv_ipc.type", "Type", base.HEX, ipc_type_valstr),
    unknown1  = ProtoField.uint16("ffxiv_ipc.unknown1", "Unknown1", base.HEX),
    server_id = ProtoField.uint16("ffxiv_ipc.server_id", "Server ID", base.HEX),
    epoch     = ProtoField.uint32("ffxiv_ipc.epoch", "Epoch", base.DEC),
    unknown2  = ProtoField.uint32("ffxiv_ipc.unknown2", "Unknown2", base.HEX),
    data      = ProtoField.bytes("ffxiv_ipc.data", "IPC Data", base.None),
}

ffxiv_ipc.fields = ipc_hdr_fields

local FFXIV_IPC_HDR_LEN = 16

local dissectIPC
local data = Dissector.get("data")

function ffxiv_ipc.dissector(tvbuf, pktinfo, root)
  local tree = root:add(ffxiv_ipc, tvbuf)

  -- dissect the magic field
  local magic_tvbr = tvbuf:range(0, 2)
  local magic_val  = magic_tvbr:le_uint()
  tree:add_le(ipc_hdr_fields.magic, magic_tvbr)

  -- dissect the type field
  local type_tvbr = tvbuf:range(2, 2)
  local type_val  = type_tvbr:le_uint()
  tree:append_text(", Type: " .. string.format('%04x', type_val))
  tree:add_le(ipc_hdr_fields.type, type_tvbr)

  -- dissect the unknown1 field
  local unknown1_tvbr = tvbuf:range(4, 2)
  local unknown1_val  = unknown1_tvbr:le_uint()
  tree:add_le(ipc_hdr_fields.unknown1, unknown1_tvbr)

  -- dissect the server_id field
  local server_id_tvbr = tvbuf:range(6, 2)
  local server_id_val  = server_id_tvbr:le_uint()
  tree:add_le(ipc_hdr_fields.server_id, server_id_tvbr)

  -- dissect the epoch field
  local epoch_tvbr = tvbuf:range(0 + 14, 2)
  local epoch_val  = epoch_tvbr:le_uint()
  tree:add_le(ipc_hdr_fields.epoch, epoch_tvbr)

  -- dissect the unknown2 field
  local unknown2_tvbr = tvbuf:range(0 + 14, 2)
  local unknown2_val  = unknown2_tvbr:le_uint()
  tree:add_le(ipc_hdr_fields.unknown2, unknown2_tvbr)

  local data_tvbr = tvbuf:range(FFXIV_IPC_HDR_LEN)
  tree:add(ipc_hdr_fields.data, data_tvbr)

  -- set the protocol column to show our protocol name
  pktinfo.cols.protocol:set("FFXIV")

  if string.find(tostring(pktinfo.cols.info), "^IPC") == nil then
      pktinfo.cols.info:set("IPC")
  end

  local tvb = data_tvbr:tvb()
  -- if type_val == segment_type.IPC then
  --   Dissector.get('ffxiv_ipc'):call(tvb, pktinfo, root)
  -- elseif type_val == segment_type.ClientKeepAlive then
  --   Dissector.get('ffxiv_client_keep_alive'):call(tvb, pktinfo, root)
  -- elseif type_val == segment_type.ServerKeepAlive then
  --   Dissector.get('ffxiv_server_keep_alive'):call(tvb, pktinfo, root)
  -- else
    pktinfo.cols.info:append(": Unknown")
    data:call(tvb, pktinfo, root)
  -- end

  return 0
end
