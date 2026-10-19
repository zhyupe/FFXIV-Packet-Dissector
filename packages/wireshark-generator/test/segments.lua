-- Run from the repository root: lua packages/wireshark-generator/test/segments.lua
-- Synthetic buffers and strict Wireshark range checks; no captured data.
local protocols, errors, ipcCalls, dataCalls = {}, {}, 0, 0
base = {DEC = 10, HEX = 16}
PI_MALFORMED, PI_ERROR = 1, 2
function Proto(name)
  local proto = {}
  protocols[name] = proto
  return proto
end
ProtoField = {uint32 = function() return {} end, uint16 = function() return {} end}
Dissector = {get = function(name)
  return {call = function(_, buffer, info, tree)
    return assert(protocols[name], name).dissector(buffer, info, tree)
  end}
end}
local tree = {}
function tree:add() return self end
function tree:add_le() end
function tree:append_text() end
function tree:add_expert_info(group, severity, message)
  assert(group == PI_MALFORMED and severity == PI_ERROR)
  errors[#errors + 1] = message
end
local column = {set = function() end, append = function() end}
local info = {cols = {protocol = column, info = column}}
local function tvb(bytes)
  return {
    len = function() return #bytes end,
    range = function(_, offset, length)
      assert(offset >= 0 and length >= 0 and offset + length <= #bytes, 'range out of bounds')
      local data = bytes:sub(offset + 1, offset + length)
      return {
        le_uint = function() return (string.unpack('<I' .. #data, data)) end,
        tvb = function() return tvb(data) end,
      }
    end,
  }
end
Proto('data').dissector = function() dataCalls = dataCalls + 1 end
Proto('ffxiv_ipc').dissector = function(buffer)
  assert(buffer:len() >= 16, 'short IPC dispatched')
  ipcCalls = ipcCalls + 1
end
dofile('src/ffxiv_client_keep_alive.lua')
dofile('src/ffxiv_server_keep_alive.lua')
dofile('src/ffxiv_segment.lua')

local function segment(kind, payload, declared)
  return string.pack('<I4I4I4I2I2', declared or 16 + #payload, 0, 0, kind, 0) .. payload
end
local count = 0
local function check(bytes, message, ipcs, unknowns)
  errors, ipcCalls, dataCalls = {}, 0, 0
  assert(protocols.ffxiv_segment.dissector(tvb(bytes), info, tree) == #bytes)
  assert(#errors == (message and 1 or 0) and errors[1] == message, 'wrong malformed diagnostic')
  assert(ipcCalls == (ipcs or 0), 'wrong IPC dispatch count')
  assert(dataCalls == (unknowns or 0), 'wrong unknown dispatch count')
  count = count + 1
end
local unknown = segment(99, '')
local ipc = segment(3, string.rep('\0', 16))
check('', nil)
check(unknown, nil, 0, 1)
check(ipc .. unknown .. ipc, nil, 2, 1)
for length = 1, 15 do
  check(string.rep('\0', length), 'Truncated segment header')
  check(ipc .. string.rep('\0', length), 'Truncated segment header', 1)
end
for _, size in ipairs({0, 1, 4, 15, 17, 32, 0xffffffff}) do
  local message = size < 16 and 'Segment size is smaller than its header' or 'Segment size exceeds available data'
  check(segment(99, '', size), message)
  check(ipc .. segment(99, '', size), message, 1)
end
-- An invalid length cannot be used to guess the next boundary.
check(segment(99, '', 0) .. ipc, 'Segment size is smaller than its header')
for _, kind in ipairs({3, 7, 8}) do
  local minimum = kind == 3 and 16 or 8
  for length = 0, minimum - 1 do
    check(segment(kind, string.rep('\0', length)) .. ipc, 'Truncated segment payload', 1)
  end
  check(segment(kind, string.rep('\0', minimum)) .. ipc, nil, kind == 3 and 2 or 1)
end
print(string.format('PASS: %d synthetic segment boundary cases', count))
