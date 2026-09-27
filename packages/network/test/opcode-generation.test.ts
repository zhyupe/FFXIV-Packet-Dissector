import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DissectorRenderer } from '../src/generate/lua/dissector'

class MemoryRenderer extends DissectorRenderer {
  files = new Map<string, string>()

  override commit(name: string, content: string) {
    this.files.set(name, content)
  }
}

test('changing lengths and adding parsers leave every version table unchanged', () => {
  const renderer = new MemoryRenderer()
  renderer.registerLength('ActorCast', 32)
  renderer.commitOpcodes()
  const original = new Map(renderer.files)
  const versions = [...original.keys()].filter(name => name.startsWith('ffxiv_ipc_type_'))
  assert(versions.length > 1)

  renderer.registerLength('ActorCast', 40)
  renderer.registerLength('ItemInfo', 64)
  renderer.commitOpcodes()

  for (const name of versions) {
    assert.equal(renderer.files.get(name), original.get(name), name)
  }
  assert.notEqual(renderer.files.get('ffxiv_ipc_map.lua'), original.get('ffxiv_ipc_map.lua'))
  assert.equal(renderer.files.get('ffxiv_ipc_resolver.lua'), original.get('ffxiv_ipc_resolver.lua'))
})
