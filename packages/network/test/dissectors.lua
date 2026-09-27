-- Run from the repository root with Lua 5.3+:
-- lua packages/network/test/dissectors.lua src/*_gen.lua
-- Strict, in-memory Wireshark API substitute; no real captures are needed.
package.path = './src/?.lua;' .. package.path
base = { HEX = 16, DEC = 10, NONE = 0, UNICODE = 0 }
ENC_UTF_8 = 0
PI_MALFORMED, PI_ERROR = 1, 2
local protocols, values, experts = {}, {}, 0
local fieldDefinitions, displayTexts = {}, {}
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
function tree:add(field, range, value)
  if field and field.abbr then
    values[field.abbr] = values[field.abbr] or {}
    table.insert(values[field.abbr], value == nil and range or value)
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
  }, { __index = function() return {} end })
end
for _, file in ipairs(arg) do dofile(file) end
assert(next(protocols), 'pass src/*_gen.lua as arguments')
local registry = require('ffxiv_ipc_type_7_56a_cn')
local function parse(name, bytes)
  values = {}
  displayTexts = {}
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
    if entry.name then
      local direction = entry.outgoing == true and 'C' or 'S'
      local dissector, title = registry.getDissector(opcode, entry.length, direction)
      assert(dissector and dissector.name == entry.name, entry.title .. ': wrong selection')
      assert(title == entry.title)
      local previous = experts
      parse(entry.name, string.rep('\0', entry.length))
      assert(experts == previous, entry.title .. ': full payload marked truncated')
      if entry.length > 0 then
        parse(entry.name, string.rep('\0', entry.length - 1))
        assert(experts == previous + 1, entry.title .. ': truncation was not reported')
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

-- If multiple known prefixes fit, selection must be stable and choose the longest.
local resolve = require('ffxiv_ipc_resolver').getDissector
local choices = {
  [0] = { name = 'ffxiv_ipc_event_play', title = 'short', length = 40 },
  [1] = { name = 'ffxiv_ipc_event_play64', title = 'long', length = 288 },
}
assert(select(2, resolve(choices, 300)) == 'long')

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
