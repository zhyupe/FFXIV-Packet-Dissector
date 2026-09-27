import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FashionReport, PacketMap } from '../src/definitions/ipc'
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
