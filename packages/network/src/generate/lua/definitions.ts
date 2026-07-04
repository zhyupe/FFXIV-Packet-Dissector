import { DissectorRenderer } from './dissector'

export function generateFromDefinitions() {
  const { PacketMap } = require('@/definitions/ipc') as {
    PacketMap: Record<string, unknown>
  }

  const renderer = new DissectorRenderer()
  for (const [name, struct] of Object.entries(PacketMap)) {
    if (!struct) continue
    renderer.handleStruct(name, struct as never)
  }

  renderer.commitEnums()
  renderer.commitOpcodes()
}
