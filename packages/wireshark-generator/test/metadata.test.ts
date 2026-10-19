import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { PacketMap, CNOpcode } from '@ffcafe/elpis-network'
import { getFields, getChildren, getEnums } from '@ffcafe/elpis-struct'
import { DissectorRenderer } from '../src/lua/dissector'
import { tableKey } from '../src/lua/table'

const output = fileURLToPath(new URL('../../../src/', import.meta.url))
class MemoryRenderer extends DissectorRenderer {
  files = new Map<string, string>()
  constructor() { super(output) }
  override commit(name: string, content: string) { this.files.set(name, content) }
}

test('published ESM structs expose metadata and generate the committed Lua', () => {
  assert.equal(Object.keys(getFields(PacketMap.ActorControl.prototype)!).length, 7)
  assert(getChildren(PacketMap.PlayerSetup.prototype))
  const renderer = new MemoryRenderer()
  for (const [name, ctor] of Object.entries(PacketMap)) {
    if (ctor) renderer.handleStruct(name, ctor)
  }
  renderer.commitEnums()
  renderer.commitOpcodes()
  assert(renderer.files.size > Object.keys(PacketMap).length)
  assert(Object.keys(CNOpcode).length > 1)
  for (const [name, content] of renderer.files) {
    const checkedIn = readFileSync(join(output, name), 'utf8')
    assert.equal(checkedIn.split('\n').slice(2).join('\n').trim(), content.trim(), name)
  }
})

test('bundled private names keep distinct nested structures and legal Lua keys', () => {
  const listChild = getChildren(PacketMap.FellowshipList.prototype)!.fellowshipMessageBoardItem
  const boardChild = getChildren(PacketMap.FellowshipMessageBoard.prototype)!.fellowshipMessageBoardItem
  assert.equal(typeof listChild, 'function')
  assert.equal(typeof boardChild, 'function')
  if (typeof listChild !== 'function' || typeof boardChild !== 'function') return
  assert.notEqual(listChild.name, boardChild.name)
  assert.equal(listChild.byteLength, 172)
  assert.equal(boardChild.byteLength, 152)
  assert.equal(tableKey('Item$1'), '["Item$1"]')
  assert.equal(tableKey('end'), '["end"]')
  assert.equal(tableKey('[0x0010]'), '[0x0010]')
  assert.equal(tableKey('ordinary'), 'ordinary')
})

test('published effect severity metadata retains upstream corrections', () => {
  const child = getChildren(PacketMap.AoeEffect8.prototype)!
  const enums = Object.values(child).flatMap(c => typeof c === 'function' ? getEnums(c) ?? [] : [])
  const severity = enums.find(e => e.name === 'ActionHitSeverityType')
  assert(severity)
  assert.equal(severity.values.CritDamage, 0x20)
  assert.equal(severity.values.DirectHitDamage, 0x40)
})

test('CLI works outside the workspace and distributes dependency licenses', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dissector output '))
  try {
    copyFileSync(join(output, 'ffxiv.lua'), join(dir, 'ffxiv.lua'))
    const result = spawnSync(process.execPath, [
      '--import', import.meta.resolve('tsx'),
      fileURLToPath(new URL('../src/index.ts', import.meta.url)), '--output', dir,
    ], { cwd: tmpdir(), encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    assert.equal(readFileSync(join(dir, 'ffxiv_ipc_map.lua'), 'utf8'), readFileSync(join(output, 'ffxiv_ipc_map.lua'), 'utf8'))
    for (const name of ['ELPIS-NETWORK-LICENSE', 'ELPIS-STRUCT-LICENSE', 'FFXIVClientStructs.LICENSE']) {
      assert(readFileSync(join(dir, 'licenses', name), 'utf8').length > 100)
    }
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
