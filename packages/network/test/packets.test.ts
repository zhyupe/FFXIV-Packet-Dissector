import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { PacketMap } from '../src/definitions/ipc'
import { ActionRequest } from '../src/definitions/ipc/action-request'
import { CountdownCancel, CountdownInitiate } from '../src/definitions/ipc/countdown'
import { MapEffect4, MapEffect8, MapEffect12 } from '../src/definitions/ipc/environment-control'
import { EventPlay64 } from '../src/definitions/ipc/event-play'
import { IslandWorkshopSupplyDemand } from '../src/definitions/ipc/island-workshop-supply-demand'
import { MapMarker128 } from '../src/definitions/ipc/map-marker'
import { PlaceFieldMarkerPreset } from '../src/definitions/ipc/place-field-marker-preset'
import { RSV } from '../src/definitions/ipc/reserved-data'
import { ResumeEventScene8 } from '../src/definitions/ipc/resume-event-scene'
import { ServerNotice } from '../src/definitions/ipc/server-notice'
import { StatusEffectList3, StatusEffectListPlayerDouble } from '../src/definitions/ipc/status-effect-list'
import { SystemLogMessage32, SystemLogMessage144 } from '../src/definitions/ipc/system-log-message'
import { BattleTalk8, BalloonTalk8 } from '../src/definitions/ipc/talk'
import { CN_7_56a } from '../src/opcode/cn-7.56a'
import type { StructConstructor } from '../src/struct/struct'
import { normalizeOpcodeTable, parsePackets } from '../src/sync/packet-names'

const { aliases, packets } = parsePackets(readFileSync(join(__dirname, 'fixtures/packets.yaml'), 'utf8'))

test('7.56a registry covers every upstream name after canonical alias normalization', () => {
  const input = JSON.parse(readFileSync(join(__dirname, 'fixtures/7.56a.json'), 'utf8'))
  const expected = normalizeOpcodeTable(input, aliases)
  const actual: Record<string, string> = {}
  for (const [opcode, items] of Object.entries(CN_7_56a)) {
    for (const item of Array.isArray(items) ? items : [items]) {
      assert(item && typeof item !== 'string')
      const metadata = packets.get(item.type)
      assert(metadata, `missing packet metadata: ${item.type}`)
      assert.equal(item.outgoing, metadata.direction === 'client-to-server', item.type)
      assert.equal(actual[item.type], undefined, `duplicate canonical name: ${item.type}`)
      actual[item.type] = `0x${Number(opcode).toString(16).padStart(4, '0').toUpperCase()}`
    }
  }
  assert.deepEqual(actual, expected)
  assert.equal(expected.EventPlay64, '0x0351')
  assert.equal(expected.EventPlay32, '0x019D')
  assert.equal(expected.ResumeEventScene16, '0x00FB')
  assert.equal(expected.ResumeEventScene8, '0x0267')
  assert.equal(expected.ResultDialog, undefined)
  assert.equal(expected.DesynthResult, undefined)
  assert.equal(expected.RecastGroup, '0x01F7')
  assert.equal(expected.CFDutyInfo, undefined)
})

test('conflicting aliases are rejected instead of silently replacing an opcode', () => {
  assert.throws(() => normalizeOpcodeTable({ RSV: '0x0010', RSVData: '0x0011' }, aliases), /Conflicting/)
})

test('ResultDialog alias uses the common eight-parameter event-resume layout', () => {
  const bytes = Buffer.alloc(40)
  bytes.writeUInt32LE(0x12345678, 0)
  bytes.writeUInt16LE(0x4321, 4)
  bytes[6] = 3
  bytes[7] = 8
  bytes.writeUInt32LE(0xabcdef01, 36)
  const packet = new ResumeEventScene8(bytes) as any
  assert.equal(packet.header.eventId, 0x12345678)
  assert.equal(packet.header.scene, 0x4321)
  assert.equal(packet.header.resumeId, 3)
  assert.equal(packet.header.paramCount, 8)
  assert.equal(packet.entities[7], 0xabcdef01)
})

test('full result variants read the last 88-byte entry and all four 16-byte statuses', () => {
  for (const n of [1, 4, 8, 16]) {
    const name = `EffectResult${n === 1 ? '' : n}`
    const ctor = (PacketMap as Record<string, StructConstructor | undefined>)[name]
    assert(ctor)
    assert.equal(ctor.byteLength, 8 + 88 * n)
    const bytes = Buffer.alloc(ctor.byteLength!)
    bytes[0] = n
    const offset = 4 + 88 * (n - 1)
    bytes.writeUInt32LE(0x12345678, offset)
    bytes.writeUInt32LE(0x89abcdef, offset + 4)
    bytes.writeUInt32LE(98765, offset + 8)
    bytes[offset + 18] = 7
    bytes[offset + 21] = 4
    const status = offset + 24 + 3 * 16
    bytes[status] = 29
    bytes.writeUInt16LE(3210, status + 2)
    bytes.writeUInt16LE(99, status + 4)
    bytes.writeFloatLE(12.5, status + 8)
    bytes.writeUInt32LE(0x10203040, status + 12)
    const packet = new ctor(bytes) as any
    assert.equal(packet.entryCount, n)
    const last = packet.entries[n - 1]
    assert.equal(last.sequence, 0x12345678)
    assert.equal(last.actorId, 0x89abcdef)
    assert.equal(last.currentHp, 98765)
    assert.equal(last.targetIndex, 7)
    assert.equal(last.effects[3].statusId, 3210)
    assert.equal(last.effects[3].duration, 12.5)
    assert.equal(last.effects[3].sourceActorId, 0x10203040)
    assert.throws(() => new ctor(bytes.subarray(0, bytes.length - 1)), RangeError)
  }
})

test('basic result variants use a four-byte header and 16-byte entries', () => {
  for (const n of [1, 4, 8, 16, 32, 64]) {
    const ctor = (PacketMap as Record<string, StructConstructor | undefined>)[`EffectResultBasic${n === 1 ? '' : n}`]
    assert(ctor)
    assert.equal(ctor.byteLength, 8 + 16 * n)
    const bytes = Buffer.alloc(ctor.byteLength!)
    bytes[0] = n
    const offset = 4 + 16 * (n - 1)
    bytes.writeUInt32LE(999, offset + 8)
    bytes[offset + 12] = 63
    const packet = new ctor(bytes) as any
    assert.equal(packet.entries[n - 1].currentHp, 999)
    assert.equal(packet.entries[n - 1].targetIndex, 63)
  }
})

test('MapEffect variants decode separate arrays at their variant-specific offsets', () => {
  for (const [ctor, count, size] of [[MapEffect4, 4, 24], [MapEffect8, 8, 48], [MapEffect12, 12, 64]] as const) {
    const bytes = Buffer.alloc(size)
    bytes[0] = count
    bytes.writeUInt16LE(0x1234, 2 + 2 * (count - 1))
    bytes.writeUInt16LE(0x5678, 2 + 2 * count + 2 * (count - 1))
    bytes[2 + 4 * count + count - 1] = 127
    const packet = new ctor(bytes)
    assert.equal(packet.states[count - 1], 0x1234)
    assert.equal(packet.flags[count - 1], 0x5678)
    assert.equal(packet.indices[count - 1], 127)
  }
})

test('EventPlay64 decodes all 64 parameters', () => {
  const bytes = Buffer.alloc(288)
  bytes.writeBigUInt64LE(0x20000000000001n, 16)
  bytes[24] = 64
  bytes.writeUInt32LE(0xcafebabe, 28 + 63 * 4)
  const packet = new EventPlay64(bytes) as any
  assert.equal(packet.header.sceneFlags, 0x20000000000001n)
  assert.equal(packet.header.paramSize, 64)
  assert.equal(packet.entities.length, 64)
  assert.equal(packet.entities[63], 0xcafebabe)
})

test('system log parameters start at 12; count is the byte at 8', () => {
  for (const [ctor, size, count] of [[SystemLogMessage32, 32, 4], [SystemLogMessage144, 144, 32]] as const) {
    const bytes = Buffer.alloc(size)
    bytes[8] = count
    bytes.writeUInt32LE(0x87654321, 12 + (count - 1) * 4)
    const packet = new ctor(bytes) as any
    assert.equal(packet.header.paramCount, count)
    assert.equal(packet.entities[count - 1], 0x87654321)
  }
})

test('countdown includes the two identity fields preceding the actor ID', () => {
  const bytes = Buffer.alloc(64)
  bytes.writeBigUInt64LE(0x123456789abcdef0n, 0)
  bytes.writeBigUInt64LE(0x1020304050607080n, 8)
  bytes.writeUInt32LE(0xfedcba98, 16)
  bytes.writeUInt16LE(15, 22)
  bytes.write('Player\0trailing', 27)
  const packet = new CountdownInitiate(bytes)
  assert.equal(packet.senderContentId, 0x123456789abcdef0n)
  assert.equal(packet.senderActorId, 0xfedcba98)
  assert.equal(packet.seconds, 15)
  assert.equal(packet.senderName, 'Player')
  assert.equal(CountdownCancel.byteLength, 56)
})

test('uint64 targets and signed marker coordinates retain their values', () => {
  const request = Buffer.alloc(40)
  request.writeBigUInt64LE(0x123456789abcdef0n, 16)
  assert.equal(new ActionRequest(request).targetId, 0x123456789abcdef0n)
  const markers = Buffer.alloc(104)
  markers.writeInt32LE(-120500, 4 + 7 * 4)
  markers.writeInt32LE(87000, 68 + 7 * 4)
  const preset = new PlaceFieldMarkerPreset(markers)
  assert.equal(preset.x[7], -120500)
  assert.equal(preset.z[7], 87000)
})

test('30/60 status slots keep independent lengths and correct strides', () => {
  const bytes = Buffer.alloc(720)
  bytes.writeUInt16LE(1234, 59 * 12)
  bytes.writeFloatLE(42.25, 59 * 12 + 4)
  const packet = new StatusEffectListPlayerDouble(bytes)
  assert.equal(packet.statusEffects[59].id, 1234)
  assert.equal(packet.statusEffects[59].duration, 42.25)
  assert.equal(StatusEffectList3.byteLength, 360)
})

test('variable strings and binary tails read remaining bytes', () => {
  const bytes = Buffer.alloc(58)
  bytes.writeUInt32LE(6)
  bytes.write('key\0not part of key', 4)
  bytes.write('value\0', 52)
  const rsv = new RSV(bytes)
  assert.equal(rsv.key, 'key')
  assert.equal(rsv.value, 'value')
  assert.equal(new ServerNotice(Buffer.from([5, 104, 105, 0, 88])).content, 'hi')
  assert.deepEqual(new IslandWorkshopSupplyDemand(Buffer.from([1, 2, 0xa3, 0xf4])).supplyDemand, Buffer.from([0xa3, 0xf4]))
})

test('all registered structures can parse their declared minimum size', () => {
  for (const [name, ctor] of Object.entries(PacketMap)) {
    if (!ctor) continue
    assert.doesNotThrow(() => new ctor(Buffer.alloc(ctor.byteLength ?? 0)), name)
  }
})

test('128-marker payload includes the type array after the three uint32 arrays', () => {
  const bytes = Buffer.alloc(1668)
  bytes[0] = 128
  bytes.writeUInt32LE(12345, 4 + 4 * 127)
  bytes.writeUInt32LE(54321, 4 + 4 * 128 + 4 * 127)
  bytes[4 + 12 * 128 + 127] = 7
  const packet = new MapMarker128(bytes)
  assert.equal(packet.iconIds[127], 12345)
  assert.equal(packet.layoutIds[127], 54321)
  assert.equal(packet.types[127], 7)
})

test('BattleTalk and BalloonTalk have different headers and parameter offsets', () => {
  const battle = Buffer.alloc(64)
  battle.writeBigUInt64LE(0x123456789abcdef0n)
  battle[30] = 8
  battle.writeUInt32LE(999, 32 + 7 * 4)
  const parsedBattle = new BattleTalk8(battle) as any
  assert.equal(parsedBattle.header.actorId, 0x123456789abcdef0n)
  assert.equal(parsedBattle.header.paramCount, 8)
  assert.equal(parsedBattle.entities[7], 999)
  const balloon = Buffer.alloc(72)
  balloon.writeBigUInt64LE(0x123456789abcdef0n, 8)
  balloon[33] = 8
  balloon.writeUInt32LE(888, 36 + 7 * 4)
  const parsedBalloon = new BalloonTalk8(balloon) as any
  assert.equal(parsedBalloon.header.actorId, 0x123456789abcdef0n)
  assert.equal(parsedBalloon.header.paramCount, 8)
  assert.equal(parsedBalloon.entities[7], 888)
})
