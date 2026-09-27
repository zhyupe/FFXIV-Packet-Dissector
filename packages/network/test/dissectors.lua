-- Run from the repository root with Lua 5.3+:
-- lua packages/network/test/dissectors.lua src/*_gen.lua
-- Strict, in-memory Wireshark API substitute; no real captures are needed.
package.path = './src/?.lua;' .. package.path
base = { HEX = 16, DEC = 10, NONE = 0, UNICODE = 0 }
ENC_UTF_8 = 0
PI_MALFORMED, PI_ERROR = 1, 2
local protocols, values, experts = {}, {}, 0
local fieldDefinitions, displayTexts, fieldTexts = {}, {}, {}
function Proto(name, title)
  assert(protocols[name] == nil, 'duplicate protocol: ' .. name)
  local proto = { name = name, title = title }
  protocols[name] = proto
  return proto
end
ProtoField = setmetatable({}, { __index = function(_, kind)
  return function(abbr, label, displayBase, valueNames)
    local definition = { abbr = abbr, kind = kind, base = displayBase, valueNames = valueNames }
    fieldDefinitions[abbr] = definition
    return definition
  end
end })
Dissector = { get = function(name)
  assert(protocols[name], 'missing dissector: ' .. name)
  return { name = name, call = function(_, tvb, info, root)
    return protocols[name].dissector(tvb, info, root)
  end }
end }
local column = { set = function() end, append = function(_, text)
  table.insert(displayTexts, text)
end }
local info = { cols = { info = column, protocol = column } }
local tree = {}
function tree:add(field, range, value, text)
  if field and field.abbr then
    values[field.abbr] = values[field.abbr] or {}
    table.insert(values[field.abbr], value == nil and range or value)
    fieldTexts[field.abbr] = text
  end
  return self
end
tree.add_le = tree.add
function tree:append_text() return self end
function tree:set_hidden() return self end
function tree:add_expert_info() experts = experts + 1 end
local function tvb(bytes)
  local obj = {}
  function obj:len() return #bytes end
  function obj:range(offset, length)
    length = length or #bytes - offset
    assert(offset >= 0 and length >= 0 and offset + length <= #bytes,
      string.format('out-of-bounds range: %d + %d > %d', offset, length, #bytes))
    local data = bytes:sub(offset + 1, offset + length)
    return {
      le_uint = function() return (string.unpack('<I' .. #data, data)) end,
      le_int = function() return (string.unpack('<i' .. #data, data)) end,
      le_uint64 = function() return (string.unpack('<I8', data)) end,
      le_int64 = function() return (string.unpack('<i8', data)) end,
      le_float = function() return (string.unpack('<f', data)) end,
      float = function() return (string.unpack('<f', data)) end,
      raw = function() return data end,
      string = function() return data end,
      tvb = function() return tvb(data) end,
    }
  end
  return obj
end
package.preload.ffxiv_db = function()
  return setmetatable({
    Status = { [3210] = 'Test Status' },
    ClassJob = { [19] = 'Test Job' },
    LogMessage = { [77] = 'Test Log Message' },
    PlaceName = { [42] = 'Test Place' },
    ContentFinderCondition = { [42] = 'Test Duty' },
    ContentRoulette = { [7] = 'Test Roulette' },
  }, { __index = function() return {} end })
end
for _, file in ipairs(arg) do dofile(file) end
assert(next(protocols), 'pass src/*_gen.lua as arguments')
local registry = require('ffxiv_ipc_type_7_56a_cn')
local packets = require('ffxiv_ipc_map')
local function parse(name, bytes)
  values = {}
  displayTexts = {}
  fieldTexts = {}
  Dissector.get(name):call(tvb(bytes), info, tree)
end
local function field(name, index)
  assert(values[name], 'field not decoded: ' .. name)
  return values[name][index or 1]
end
local function replace(bytes, offset, data)
  return bytes:sub(1, offset) .. data .. bytes:sub(offset + #data + 1)
end

local count = 0
for opcode, entries in pairs(registry.types) do
  for _, entry in pairs(entries) do
    local packet = packets[entry.type]
    if packet then
      local length = entry.length or packet.length
      local expectedTitle = entry.title or entry.type
      local direction = entry.outgoing == true and 'C' or 'S'
      local dissector, title = registry.getDissector(opcode, length, direction)
      assert(dissector and dissector.name == packet.name, expectedTitle .. ': wrong selection')
      assert(title == expectedTitle)
      local previous = experts
      parse(packet.name, string.rep('\0', length))
      assert(experts == previous, expectedTitle .. ': full payload marked truncated')
      if length > 0 then
        parse(packet.name, string.rep('\0', length - 1))
        assert(experts == previous + 1, expectedTitle .. ': truncation was not reported')
      end
      count = count + 1
    end
  end
end

-- Opcode 0x0187 is shared by outgoing ClientTrigger and incoming FreeCompanyDialog.
local d, title = registry.getDissector(0x0187, 80, 'C')
assert(d and title == 'ClientTrigger')
d, title = registry.getDissector(0x0187, 80, 'S')
assert(d and title == 'FreeCompanyDialog')
assert(registry.getDissector(0x0187, 32, 'S') == nil)
assert(registry.getDissector(0x0131, 95, 'S') == nil)
assert(registry.getDissector(0xFFFF, 1024, 'S') == nil)
assert(select(2, registry.getDissector(0x0351, 288, 'S')) == 'EventPlay64')

-- Synthetic queue update with independent fields and full-width duty IDs.
local queueUpdate = string.rep('\0', 40)
queueUpdate = replace(queueUpdate, 0, string.char(2, 19, 10) .. string.rep('\165', 5))
queueUpdate = replace(queueUpdate, 8, string.pack('<I8', 0x0123456789ABCDEF))
queueUpdate = replace(queueUpdate, 16, string.char(7, 90, 90, 129))
queueUpdate = replace(queueUpdate, 20, string.pack('<I4I4I4I4I4', 42, 0, 0x12345678, 0x80000001, 0xFFFFFFFF))
parse('ffxiv_ipc_content_finder_notify', queueUpdate)
assert(field('ffxiv_ipc_content_finder_notify.type') == 2)
assert(fieldDefinitions['ffxiv_ipc_content_finder_notify.type'].valueNames[2] == 'Queued')
assert(fieldDefinitions['ffxiv_ipc_content_finder_notify.class_job'].valueNames[19] == 'Test Job')
assert(field('ffxiv_ipc_content_finder_notify.class_job') == 19)
assert(field('ffxiv_ipc_content_finder_notify.language_flags') == 10)
assert(field('ffxiv_ipc_content_finder_notify.unknown1') == string.rep('\165', 5))
assert(field('ffxiv_ipc_content_finder_notify.flags') == 0x0123456789ABCDEF)
assert(field('ffxiv_ipc_content_finder_notify.roulette') == 7)
assert(fieldDefinitions['ffxiv_ipc_content_finder_notify.roulette'].valueNames[7] == 'Test Roulette')
assert(field('ffxiv_ipc_content_finder_notify.unknown2') == string.char(90, 90))
assert(field('ffxiv_ipc_content_finder_notify.queue_start_flags') == 129)
local queueDuties = { 42, 0, 0x12345678, 0x80000001, 0xFFFFFFFF }
assert(#values['ffxiv_ipc_content_finder_notify_instance.content'] == #queueDuties)
for index, id in ipairs(queueDuties) do
  assert(field('ffxiv_ipc_content_finder_notify_instance.content', index) == id)
end
assert(fieldDefinitions['ffxiv_ipc_content_finder_notify_instance.content'].valueNames[42] == 'Test Duty')
parse('ffxiv_ipc_content_finder_notify', string.rep('\0', 40))
assert(#values['ffxiv_ipc_content_finder_notify_instance.content'] == 5)
for index = 1, 5 do
  assert(field('ffxiv_ipc_content_finder_notify_instance.content', index) == 0)
end
assert(select(2, registry.getDissector(0x0310, 40, 'S')) == 'ContentFinderNotify')
assert(registry.getDissector(0x0310, 39, 'S') == nil)
assert(registry.getDissector(0x0310, 40, 'C') == nil)

-- Synthetic progress response: counts remain unsigned, without percentage scaling.
local progress = string.pack('<I2I2I4I4I4', 514, 0, 42, 0x80000001, 0xFFFFFFFF) .. string.rep('\0', 16)
parse('ffxiv_ipc_actor_control_self', progress)
assert(fieldDefinitions['ffxiv_ipc_actor_control_self.type'].valueNames[514] == 'AchievementSetRate')
assert(field('ffxiv_ipc_actor_control_self.data0') == 42)
assert(field('ffxiv_ipc_actor_control_self.data1') == 0x80000001)
assert(field('ffxiv_ipc_actor_control_self.data2') == 0xFFFFFFFF)
assert(fieldTexts['ffxiv_ipc_actor_control_self.data0'] == 'Achievement: 42')
assert(fieldTexts['ffxiv_ipc_actor_control_self.data1'] == 'Current: 2147483649')
assert(fieldTexts['ffxiv_ipc_actor_control_self.data2'] == 'Max: 4294967295')
parse('ffxiv_ipc_actor_control_self', replace(progress, 0, string.pack('<I2', 65535)))
assert(fieldTexts['ffxiv_ipc_actor_control_self.data1'] == 'data1: 2147483649')
assert(fieldTexts['ffxiv_ipc_actor_control_self.data2'] == 'data2: 4294967295')

-- Synthetic completion bitmap and separate auxiliary flags, with ordered history.
local achievementBytes = {}
for i = 1, 552 do achievementBytes[i] = 0 end
local completedIds = { 0, 7, 8, 31, 4077, 4079 }
for _, id in ipairs(completedIds) do
  local index = math.floor(id / 8) + 1
  achievementBytes[index] = achievementBytes[index] + 2 ^ (id % 8)
end
local auxiliaryIndices = { 0, 7, 8, 127, 207 }
for _, id in ipairs(auxiliaryIndices) do
  local index = 520 + math.floor(id / 8) + 1
  achievementBytes[index] = achievementBytes[index] + 2 ^ (id % 8)
end
for i, byte in ipairs(achievementBytes) do achievementBytes[i] = string.char(byte) end
local completion = table.concat(achievementBytes)
local history = { 501, 42, 903, 17, 600 }
for index, id in ipairs(history) do
  completion = replace(completion, 510 + (index - 1) * 2, string.pack('<I2', id))
end
completion = replace(completion, 546, string.rep('\165', 6))
parse('ffxiv_ipc_achievement', completion)
assert(#values['ffxiv_ipc_achievement.completed_achievement_ids'] == #completedIds)
for index, id in ipairs(completedIds) do
  assert(field('ffxiv_ipc_achievement.completed_achievement_ids', index) == id)
end
for index, id in ipairs(history) do assert(field('ffxiv_ipc_achievement.history', index) == id) end
assert(#values['ffxiv_ipc_achievement.auxiliary_flag_indices'] == #auxiliaryIndices)
for index, id in ipairs(auxiliaryIndices) do
  assert(field('ffxiv_ipc_achievement.auxiliary_flag_indices', index) == id)
end
assert(field('ffxiv_ipc_achievement.unknown_tail') == string.rep('\165', 6))
parse('ffxiv_ipc_achievement', string.rep('\0', 552))
assert(values['ffxiv_ipc_achievement.completed_achievement_ids'] == nil)
assert(values['ffxiv_ipc_achievement.auxiliary_flag_indices'] == nil)
assert(#values['ffxiv_ipc_achievement.history'] == 5)
assert(select(2, registry.getDissector(0x0188, 552, 'S')) == 'Achievement')
assert(registry.getDissector(0x0188, 551, 'S') == nil)
assert(registry.getDissector(0x0188, 552, 'C') == nil)

-- Synthetic player spawn with distinct header, status, equipment and text values.
local player = string.rep('\0', 664)
player = replace(player, 0, string.pack('<I8I8', 0x0102030405060708, 0x1112131415161718))
player = replace(player, 0x10, string.pack('<I2I2I2I2', 27, 51, 101, 202))
player = replace(player, 0x6c, string.pack('<I4I4', 123456, 98765))
player = replace(player, 0x7a, string.pack('<I2I2I2', 7654, 4321, 0x1234))
player = replace(player, 0x84, string.pack('<I2I2', 0x2345, 0x3456))
player = replace(player, 0x96, string.char(87, 19))
for i = 0, 29 do
  player = replace(player, 0xa8 + i * 12, string.pack('<I2I2fI4', 1000 + i, 200 + i, i + 0.5, i + 1))
end
player = replace(player, 0x210, string.pack('<fff', 1.25, -2.5, 3.75))
for i = 0, 9 do
  player = replace(player, 0x21c + i * 4, string.pack('<I4', 0x80000000 + i))
  player = replace(player, 0x244 + i, string.char(i + 10))
end
player = replace(player, 0x24e, string.pack('<I2I2', 321, 654))
player = replace(player, 0x252, 'Synthetic Player')
player = replace(player, 0x272, string.rep('\165', 26))
player = replace(player, 0x28c, 'TEST\0\0')
player = replace(player, 0x292, string.rep('\90', 6))
parse('ffxiv_ipc_player_spawn', player)
assert(field('ffxiv_ipc_player_spawn.account_id') == 0x0102030405060708)
assert(field('ffxiv_ipc_player_spawn.content_id') == 0x1112131415161718)
assert(field('ffxiv_ipc_player_spawn.current_world_id') == 101)
assert(field('ffxiv_ipc_player_spawn.home_world_id') == 202)
assert(field('ffxiv_ipc_player_spawn.hp_max') == 123456)
assert(field('ffxiv_ipc_player_spawn.hp_cur') == 98765)
assert(field('ffxiv_ipc_player_spawn.resource_points_max') == 7654)
assert(field('ffxiv_ipc_player_spawn.resource_points') == 4321)
assert(field('ffxiv_ipc_player_spawn.behavior') == 0x1234)
assert(field('ffxiv_ipc_player_spawn.current_mount') == 0x2345)
assert(field('ffxiv_ipc_player_spawn.active_minion') == 0x3456)
assert(field('ffxiv_ipc_player_spawn.level') == 87)
assert(field('ffxiv_ipc_player_spawn.class_job') == 19)
assert(#values['ffxiv_ipc_status_effect.id'] == 30)
assert(field('ffxiv_ipc_status_effect.id', 1) == 1000)
assert(field('ffxiv_ipc_status_effect.id', 30) == 1029)
assert(field('ffxiv_ipc_status_effect.duration', 30) == 29.5)
assert(field('ffxiv_ipc_position.x') == 1.25 and field('ffxiv_ipc_position.y') == -2.5)
assert(field('ffxiv_ipc_position.z') == 3.75)
assert(#values['ffxiv_ipc_player_spawn.models'] == 10)
assert(field('ffxiv_ipc_player_spawn.models', 10) == 0x80000009)
assert(field('ffxiv_ipc_player_spawn.model_stain2_ids', 10) == 19)
assert(field('ffxiv_ipc_player_spawn.glasses_ids', 1) == 321)
assert(field('ffxiv_ipc_player_spawn.glasses_ids', 2) == 654)
assert(field('ffxiv_ipc_player_spawn.nickname') == 'Synthetic Player')
assert(field('ffxiv_ipc_player_spawn.look') == string.rep('\165', 26))
assert(field('ffxiv_ipc_player_spawn.fc_tag') == 'TEST')
assert(field('ffxiv_ipc_player_spawn.unknown_tail') == string.rep('\90', 6))
player = replace(player, 0x252, string.rep('N', 32))
player = replace(player, 0x28c, '测试')
parse('ffxiv_ipc_player_spawn', player)
assert(field('ffxiv_ipc_player_spawn.nickname') == string.rep('N', 32))
assert(field('ffxiv_ipc_player_spawn.fc_tag') == '测试')
assert(select(2, registry.getDissector(0x01C4, 664, 'S')) == 'PlayerSpawn')
assert(registry.getDissector(0x01C4, 663, 'S') == nil)
assert(registry.getDissector(0x01C4, 664, 'C') == nil)

-- Synthetic Doman state keeps unknown bytes nonzero to check the 16-bit widths.
for _, donated in ipairs({ 0, 1234, 2468, 65535 }) do
  for _, factor in ipairs({ 0, 35, 255 }) do
    local bytes = string.char(12, 1) .. string.pack('<I2', donated)
      .. string.char(factor, 2, 1, 0x5a) .. string.pack('<I2', 54321) .. string.rep('\165', 6)
    parse('ffxiv_ipc_doman_enclave_state', bytes)
    assert(field('ffxiv_ipc_doman_enclave_state.current_milestone') == 12)
    assert(field('ffxiv_ipc_doman_enclave_state.is_accepting_donations') == 1)
    assert(field('ffxiv_ipc_doman_enclave_state.donated') == donated)
    assert(field('ffxiv_ipc_doman_enclave_state.price_ratio_percent') == factor + 100)
    assert(field('ffxiv_ipc_doman_enclave_state.refresh_ui') == 2)
    assert(field('ffxiv_ipc_doman_enclave_state.refresh_zone') == 1)
    assert(field('ffxiv_ipc_doman_enclave_state.unknown7') == 0x5a)
    assert(field('ffxiv_ipc_doman_enclave_state.allowance') == 54321)
    assert(field('ffxiv_ipc_doman_enclave_state.unknown_tail') == string.rep('\165', 6))
  end
end
assert(fieldDefinitions['ffxiv_ipc_doman_enclave_state.price_ratio_percent'].kind == 'double')
assert(select(2, registry.getDissector(0x0340, 16, 'S')) == 'DomanEnclaveState')
assert(registry.getDissector(0x0340, 15, 'S') == nil)
assert(registry.getDissector(0x0340, 16, 'C') == nil)

-- Artificial membership bits exercise both slots and the entire bitmap capacity.
local achievementIds = { 0, 7, 8, 19, 4077, 4078, 4079 }
for slot = 0, 1 do
  local bitmap = {}
  for i = 1, 510 do bitmap[i] = 0 end
  for _, id in ipairs(achievementIds) do
    local index = math.floor(id / 8) + 1
    bitmap[index] = bitmap[index] + 2 ^ (id % 8)
  end
  for i, byte in ipairs(bitmap) do bitmap[i] = string.char(byte) end
  local bytes = string.pack('<I4', slot) .. table.concat(bitmap) .. string.rep('\165', 6)
  parse('ffxiv_ipc_near_completion_achievements', bytes .. string.rep('\255', 8))
  assert(field('ffxiv_ipc_near_completion_achievements.slot') == slot)
  assert(#values['ffxiv_ipc_near_completion_achievements.achievement_ids'] == #achievementIds)
  for index, id in ipairs(achievementIds) do
    assert(field('ffxiv_ipc_near_completion_achievements.achievement_ids', index) == id)
  end
  assert(field('ffxiv_ipc_near_completion_achievements.unknown_tail') == string.rep('\165', 6))
end
local slotNames = fieldDefinitions['ffxiv_ipc_near_completion_achievements.slot'].valueNames
assert(slotNames[0] == 'LoginNotification' and slotNames[1] == 'AchievementAddon')
parse('ffxiv_ipc_near_completion_achievements', string.rep('\0', 520))
assert(values['ffxiv_ipc_near_completion_achievements.achievement_ids'] == nil)
assert(select(2, registry.getDissector(0x00D3, 520, 'S')) == 'NearCompletionAchievements')
assert(registry.getDissector(0x00D3, 519, 'S') == nil)
assert(registry.getDissector(0x00D3, 520, 'C') == nil)

-- Synthetic fixed-point values; no captured payloads or player identifiers.
local jobs = { 'carpenter', 'blacksmith', 'armorer', 'goldsmith', 'leatherworker', 'weaver', 'alchemist', 'culinarian' }
local levels, rawLevels = {}, { 0, 1, 100, 101, 12345, 23456, 34567, 0xffffffff }
for index, value in ipairs(rawLevels) do levels[index] = string.pack('<I4', value) end
parse('ffxiv_ipc_desynthesis_levels', table.concat(levels))
for index, job in ipairs(jobs) do
  local key = 'ffxiv_ipc_desynthesis_levels.' .. job
  assert(field(key) == rawLevels[index] / 100)
  assert(fieldDefinitions[key].kind == 'double', 'fixed-point levels must retain fractions')
end
assert(select(2, registry.getDissector(0x025D, 32, 'S')) == 'DesynthesisLevels')
assert(registry.getDissector(0x025D, 31, 'S') == nil)
assert(registry.getDissector(0x025D, 32, 'C') == nil)

-- If multiple known prefixes fit, selection must be stable and choose the longest.
local resolve = require('ffxiv_ipc_resolver').getDissector
local choices = {
  [0] = { type = 'EventPlay', title = 'short' },
  [1] = { type = 'EventPlay64', title = 'long' },
}
assert(select(2, resolve(choices, 300)) == 'long')
assert(select(2, resolve(choices, 288)) == 'long')
assert(select(2, resolve(choices, 287)) == 'short')

-- Shared length changes apply without replacing or modifying a version table.
local previousLength = packets.EventPlay64.length
packets.EventPlay64.length = 320
assert(select(2, resolve(choices, 300)) == 'short')
assert(registry.getDissector(0x0351, 288, 'S') == nil)
assert(select(2, registry.getDissector(0x0351, 320, 'S')) == 'EventPlay64')
-- Explicit version lengths take precedence, including zero.
choices[1].length = 288
assert(select(2, resolve(choices, 300)) == 'long')
assert(resolve({ [0] = { type = 'EventPlay', length = 0 } }, 0) ~= nil)
packets.EventPlay64.length = previousLength

-- Unknown structures retain their title even if a version declares a length.
d, title = resolve({ [0] = { type = 'UnknownPacket', length = 8 } }, 32)
assert(d == nil and title == 'UnknownPacket')
d, title = resolve({ [0] = { type = 'UnknownPacket', title = 'custom', length = 8 } }, 32)
assert(d == nil and title == 'custom')
assert(resolve({ [0] = { type = 'EventPlay', outgoing = false } }, 40, 'C') == nil)

local result = string.rep('\0', 360)
result = replace(result, 0, string.char(4))
result = replace(result, 4 + 3 * 88 + 8, string.pack('<I4', 98765))
result = replace(result, 4 + 3 * 88 + 24 + 3 * 16 + 2, string.pack('<I2', 3210))
result = replace(result, 4 + 3 * 88 + 24 + 3 * 16 + 8, string.pack('<f', 12.5))
parse('ffxiv_ipc_effect_result4', result)
assert(field('ffxiv_ipc_effect_result_entry.current_hp', 4) == 98765)
assert(field('ffxiv_ipc_effect_result_status.duration', 16) == 12.5)
assert(fieldDefinitions['ffxiv_ipc_effect_result_status.status_id'].valueNames[3210] == 'Test Status')
assert(fieldDefinitions['ffxiv_ipc_effect_result_status.source_actor_id'].base == base.HEX)
assert(fieldDefinitions['ffxiv_ipc_effect_result_entry.actor_id'].base == base.HEX)
assert(fieldDefinitions['ffxiv_ipc_effect_result_entry.class_id'].valueNames[19] == 'Test Job')
assert(table.concat(displayTexts):find('statusId: Test Status', 1, true))

for _, variant in ipairs({ { '', 24, 2 }, { '32', 32, 4 }, { '48', 48, 8 }, { '80', 80, 16 }, { '144', 144, 32 } }) do
  local name, size, capacity = 'ffxiv_ipc_system_log_message' .. variant[1], variant[2], variant[3]
  local log = string.rep('\0', size)
  log = replace(log, 0, string.pack('<I4I4', 1376257, 77))
  log = replace(log, 8, string.char(capacity))
  log = replace(log, 12, string.pack('<I4', 42))
  log = replace(log, 12 + (capacity - 1) * 4, string.pack('<I4', 99))
  parse(name, log)
  assert(field(name .. '.param' .. capacity) == 99)
  assert(fieldDefinitions[name .. '.event_id'].valueNames[1376257] == 'Fishing')
  assert(fieldDefinitions[name .. '.log_message_id'].valueNames[77] == 'Test Log Message')
  local text = table.concat(displayTexts)
  assert(text:find('eventId: Fishing', 1, true))
  assert(text:find('logMessageId: Test Log Message', 1, true))
  assert(text:find('PlaceName: Test Place (42)', 1, true))
  parse(name, replace(log, 0, string.pack('<I4', 0)))
  assert(table.concat(displayTexts):find('param1: 42', 1, true))
end

local map = string.rep('\0', 64)
map = replace(map, 24, string.pack('<I2', 0x1234))
map = replace(map, 48, string.pack('<I2', 0x5678))
map = replace(map, 61, string.char(127))
parse('ffxiv_ipc_map_effect12', map)
assert(field('ffxiv_ipc_map_effect12.states', 12) == 0x1234)
assert(field('ffxiv_ipc_map_effect12.flags', 12) == 0x5678)
assert(field('ffxiv_ipc_map_effect12.indices', 12) == 127)

local event = replace(string.rep('\0', 288), 28 + 63 * 4, string.pack('<I4', 0x12345678))
parse('ffxiv_ipc_event_play64', event)
assert(field('ffxiv_ipc_event_play64.entities', 64) == 0x12345678)
parse('ffxiv_ipc_server_notice', string.char(5) .. 'message\0ignored')
assert(field('ffxiv_ipc_server_notice.content') == 'message')
parse('ffxiv_ipc_island_workshop_supply_demand', string.char(1, 2, 0xa3, 0xf4))
assert(field('ffxiv_ipc_island_workshop_supply_demand.supply_demand') == string.char(0xa3, 0xf4))
print(string.format('PASS: %d registered payloads, truncation guards, direction/alias dispatch, and binary fixtures', count))
