import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CharaCard, CharaCardData, PacketMap } from '../src/definitions/ipc'
import { NormalizedOpcode } from '../src/opcode'

test('adventurer plate separates identity, portrait data and bounded text', () => {
  const bytes = Buffer.alloc(480)
  bytes.writeBigUInt64LE(1n << 60n, 0)
  bytes.writeBigUInt64LE((1n << 63n) + 1n, 8)
  bytes.writeBigUInt64LE((1n << 62n) + 2n, 16)
  bytes.writeUInt32LE(0xabcdef01, 24)
  bytes.writeUInt32LE(3, 28)
  bytes.writeUInt16LE(31, 32)
  bytes.writeUInt16LE(75, 34)
  bytes[36] = 19
  bytes[37] = 1
  bytes[38] = 3
  bytes[39] = 5
  bytes[0x28] = 1
  bytes[0x33] = 20
  bytes.fill(0xa5, 0x34, 0x4e)
  bytes[0x4e + 11] = 11
  bytes[0x5a] = 0x0f
  bytes[0x5b] = 9
  bytes[0x5c] = 10
  bytes[0x5d] = 21
  bytes[0x5e] = 1
  bytes[0x60] = 0x80
  bytes[0x62] = 1
  bytes[0x64] = 5
  bytes[0x69] = 9
  bytes[0x6a] = 3
  bytes[0x6b] = 1
  bytes[0x6c] = 1
  bytes[0x6d + 11] = 12
  bytes.writeUInt16LE(123, 0x7c)
  for (let i = 0; i < 3; i++) bytes.writeUInt16LE(0x8000 + i, 0x86 + i * 2)
  bytes.writeUInt16LE(257, 0x9e)
  bytes.writeUInt16LE(258, 0xa0)
  bytes.writeUInt16LE(259, 0xaa)
  bytes.writeUInt16LE(260, 0xae)
  for (let i = 0; i < 12; i++) bytes.writeUInt32LE(70000 + i, 0xb4 + i * 4)
  bytes.writeInt32LE(-1, 0xe4)
  bytes.write('  Synthetic\r说明\0ignored', 0xe8)
  bytes.write('测试\0ignored', 0x1a9)
  bytes.write('Synthetic FC\0ignored', 0x1c9)
  bytes[0x1df] = 0x5a
  const packet = new CharaCard(bytes)
  assert.equal(PacketMap[NormalizedOpcode.CharaCard], CharaCard)
  assert.equal(CharaCard.byteLength, 480)
  assert.equal(CharaCardData.byteLength, 188)
  assert.equal(packet.freeCompanyCrest, 1n << 60n)
  assert.equal(packet.accountId, (1n << 63n) + 1n)
  assert.equal(packet.contentId, (1n << 62n) + 2n)
  assert.equal(packet.entityId, 0xabcdef01)
  assert.equal(packet.state, 3)
  assert.equal(packet.worldId, 31)
  assert.equal(packet.level, 75)
  assert.equal(packet.classJob, 19)
  assert.equal(packet.sex, 1)
  assert.equal(packet.grandCompany, 3)
  assert.equal(packet.grandCompanyRank, 5)
  assert.equal(packet.data.version, 1)
  assert.equal(packet.data.portraitClassJob, 20)
  assert.deepEqual(packet.data.customize, Buffer.alloc(26, 0xa5))
  assert.equal(packet.data.itemStain0Ids[11], 11)
  assert.equal(packet.data.itemStain1Ids[11], 12)
  assert.equal(packet.data.gearVisibilityFlags, 15)
  assert.equal(packet.data.topBorder, 9)
  assert.equal(packet.data.bottomBorder, 10)
  assert.equal(packet.data.preferredClassJob, 21)
  assert.deepEqual(packet.data.activeHoursWeekdays, [0, 23])
  assert.deepEqual(packet.data.activeHoursWeekends, [8])
  assert.deepEqual(packet.data.playStyles, [5, 0, 0, 0, 0, 9])
  assert.equal(packet.data.flags, 3)
  assert.equal(packet.data.layoutFlags, 1)
  assert.equal(packet.data.privacyFlags, 1)
  assert.equal(packet.data.animationProgress, 12.3)
  assert.deepEqual(packet.data.cameraPositionRaw, [0x8000, 0x8001, 0x8002])
  assert.equal(packet.data.titleId, 257)
  assert.equal(packet.data.basePlate, 258)
  assert.equal(packet.data.decorations[4], 259)
  assert.equal(packet.data.glassesIds[1], 260)
  assert.deepEqual(packet.data.itemIds, Array.from({ length: 12 }, (_, i) => 70000 + i))
  assert.equal(packet.timestamp, -1)
  assert.equal(packet.searchComment, '  Synthetic\r说明')
  assert.deepEqual(packet.searchCommentRaw, bytes.subarray(0xe8, 0x1a9))
  assert.equal(packet.name, '测试')
  assert.equal(packet.freeCompany, 'Synthetic FC')
  assert.equal(packet.unknown1DF, 0x5a)
  assert.throws(() => new CharaCard(bytes.subarray(0, 479)), RangeError)
})

test('adventurer plate strings do not bleed into adjacent fields', () => {
  const bytes = Buffer.alloc(480)
  const empty = new CharaCard(bytes)
  assert.deepEqual(empty.data.activeHoursWeekdays, [])
  assert.deepEqual(empty.data.activeHoursWeekends, [])
  bytes.fill(0xff, 0x5e, 0x64)
  bytes.fill(0x41, 0xe8, 0x1a9)
  bytes.fill(0x42, 0x1a9, 0x1c9)
  bytes.fill(0x43, 0x1c9, 0x1df)
  bytes[0x1df] = 0x44
  const packet = new CharaCard(bytes)
  assert.deepEqual(packet.data.activeHoursWeekdays, Array.from({ length: 24 }, (_, i) => i))
  assert.deepEqual(packet.data.activeHoursWeekends, packet.data.activeHoursWeekdays)
  assert.equal(packet.searchComment, 'A'.repeat(193))
  assert.equal(packet.name, 'B'.repeat(32))
  assert.equal(packet.freeCompany, 'C'.repeat(22))
  bytes[0xe8] = 0xff
  assert.equal(new CharaCard(bytes).searchCommentRaw[0], 0xff)
})
