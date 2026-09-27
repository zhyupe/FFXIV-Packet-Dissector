export const opcodeResolver = `local packets = require("ffxiv_ipc_map")
local M = {}

-- Generated opcode arrays use zero-based indices. Prefer exact lengths, then
-- the longest known prefix; never let Lua's table iteration order pick a type.
function M.getDissector(types, length, direction)
  if type(types) ~= "table" then return nil end
  local outgoing = nil
  if direction == "C" then outgoing = true end
  if direction == "S" then outgoing = false end
  local title, bestName, bestTitle, bestLength = nil, nil, nil, nil
  local index = 0
  while types[index] ~= nil do
    local entry = types[index]
    if outgoing == nil or entry.outgoing == nil or entry.outgoing == outgoing then
      local entryTitle = entry.title or entry.type
      title = title or entryTitle
      local packet = packets[entry.type]
      if packet ~= nil then
        local packetLength = entry.length or packet.length
        if packetLength <= length and (bestLength == nil or packetLength > bestLength) then
          bestName, bestTitle, bestLength = packet.name, entryTitle, packetLength
        end
      end
    end
    index = index + 1
  end
  if bestName ~= nil then
    return Dissector.get(bestName), bestTitle
  end
  return nil, title
end

return M`
