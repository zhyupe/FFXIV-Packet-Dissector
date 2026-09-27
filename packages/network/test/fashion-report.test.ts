import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FashionReport, FashionReportHighScore, PacketMap } from '../src/definitions/ipc'
import { NormalizedOpcode } from '../src/opcode'

test('fashion preview preserves all eleven uint16 theme slots and unknown tail', () => {
  const bytes = Buffer.alloc(32)
  bytes[0] = 87
  bytes[1] = 2
  bytes.writeUInt16LE(0xabcd, 2)
  const themes = Array.from({ length: 11 }, (_, i) => i % 2 ? 0 : 0x8000 + i)
  themes[10] = 0xffff
  themes.forEach((theme, i) => bytes.writeUInt16LE(theme, 4 + 2 * i))
  bytes.fill(0xa5, 26)

  const packet = new FashionReport(bytes)
  assert.equal(PacketMap[NormalizedOpcode.FashionReport], FashionReport)
  assert.equal(FashionReport.byteLength, 32)
  assert.equal(packet.highScore, 87)
  assert.equal(packet.remainingAttempts, 2)
  assert.equal(packet.weeklyTheme, 0xabcd)
  assert.deepEqual(packet.itemThemes, themes)
  assert.deepEqual(packet.unknownTail, Buffer.alloc(6, 0xa5))
  assert.throws(() => new FashionReport(bytes.subarray(0, 31)), RangeError)
})

test('empty fashion preview retains its zero-valued theme slots', () => {
  const packet = new FashionReport(Buffer.alloc(32))
  assert.equal(packet.highScore, 0)
  assert.equal(packet.remainingAttempts, 0)
  assert.equal(packet.weeklyTheme, 0)
  assert.deepEqual(packet.itemThemes, Array(11).fill(0))
})

test('fashion high score keeps eleven item/evaluation slots and both dye channels', () => {
  const bytes = Buffer.alloc(80)
  bytes[0] = 73
  bytes.fill(0xa5, 1, 4)
  const items = Array.from({ length: 11 }, (_, i) => 70000 + i)
  items[1] += 1000000
  items[2] += 500000
  items[10] = 0xffffffff
  items.forEach((id, i) => bytes.writeUInt32LE(id, 4 + 4 * i))
  bytes.writeUInt16LE(0xabcd, 0x30)
  bytes.writeUInt16LE(0xffff, 0x32)
  for (let i = 0; i < 6; i++) {
    bytes[0x34 + i] = 10 + i
    bytes[0x3a + i] = 20 + i
  }
  const evaluations = Array.from({ length: 11 }, (_, i) => i % 7)
  evaluations[10] = 255
  evaluations.forEach((value, i) => { bytes[0x40 + i] = value })
  bytes.fill(0x5a, 0x4b)
  const packet = new FashionReportHighScore(bytes)
  assert.equal(PacketMap[NormalizedOpcode.FashionReportHighScore], FashionReportHighScore)
  assert.equal(FashionReportHighScore.byteLength, 80)
  assert.equal(packet.score, 73)
  assert.deepEqual(packet.unknown1, Buffer.alloc(3, 0xa5))
  assert.deepEqual(packet.itemIds, items)
  assert.deepEqual(packet.glassesIds, [0xabcd, 0xffff])
  assert.deepEqual(packet.stain0Ids, [10, 11, 12, 13, 14, 15])
  assert.deepEqual(packet.stain1Ids, [20, 21, 22, 23, 24, 25])
  assert.deepEqual(packet.itemEvaluations, evaluations)
  assert.deepEqual(packet.unknownTail, Buffer.alloc(5, 0x5a))
  assert.throws(() => new FashionReportHighScore(bytes.subarray(0, 79)), RangeError)
})

test('zero score and empty items do not suppress evaluation slots', () => {
  const bytes = Buffer.alloc(80)
  bytes[0x40 + 3] = 5
  const packet = new FashionReportHighScore(bytes)
  assert.equal(packet.score, 0)
  assert.deepEqual(packet.itemIds, Array(11).fill(0))
  assert.equal(packet.itemEvaluations.length, 11)
  assert.equal(packet.itemEvaluations[3], 5)
})
