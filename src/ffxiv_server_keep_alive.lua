local ffxiv_server_keep_alive = Proto("ffxiv_server_keep_alive", "FFXIV Server Keep Alive")

local server_keep_alive_fields =
{
    id    = ProtoField.uint32("ffxiv_server_keep_alive.id", "ID", base.DEC),
    epoch = ProtoField.uint32("ffxiv_server_keep_alive.epoch", "Epoch", base.DEC),
}

ffxiv_server_keep_alive.fields = server_keep_alive_fields

function ffxiv_server_keep_alive.dissector(tvbuf, pktinfo, root)
  local tree = root:add(ffxiv_server_keep_alive, tvbuf:range(0, 8))
  
  -- dissect the id field
  local id_tvbr = tvbuf:range(0, 4)
  local id_val  = id_tvbr:le_uint()
  tree:add_le(server_keep_alive_fields.id, id_tvbr)

  -- dissect the epoch field
  local epoch_tvbr = tvbuf:range(4, 4)
  local epoch_val  = epoch_tvbr:le_uint()
  tree:add_le(server_keep_alive_fields.epoch, epoch_tvbr)

  pktinfo.cols.info:set("ServerKeepAlive: ID=" .. id_val .. " Epoch=" .. epoch_val)
  return 8
end
