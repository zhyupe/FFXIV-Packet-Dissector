local ffxiv_client_keep_alive = Proto("ffxiv_client_keep_alive", "FFXIV Client Keep Alive")

local client_keep_alive_fields =
{
    id    = ProtoField.uint32("ffxiv_client_keep_alive.id", "ID", base.DEC),
    epoch = ProtoField.uint32("ffxiv_client_keep_alive.epoch", "Epoch", base.DEC),
}

ffxiv_client_keep_alive.fields = client_keep_alive_fields

function ffxiv_client_keep_alive.dissector(tvbuf, pktinfo, root)
  local tree = root:add(ffxiv_client_keep_alive, tvbuf:range(0, 8))
  
  -- dissect the id field
  local id_tvbr = tvbuf:range(0, 4)
  local id_val  = id_tvbr:le_uint()
  tree:add_le(client_keep_alive_fields.id, id_tvbr)

  -- dissect the epoch field
  local epoch_tvbr = tvbuf:range(4, 4)
  local epoch_val  = epoch_tvbr:le_uint()
  tree:add_le(client_keep_alive_fields.epoch, epoch_tvbr)

  pktinfo.cols.info:set("ClientKeepAlive: ID=" .. id_val .. " Epoch=" .. epoch_val)
  return 8
end
