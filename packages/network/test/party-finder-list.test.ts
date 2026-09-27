import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PacketMap, PartyFinderList, PartyFinderListing } from '../src/definitions/ipc'
import { NormalizedOpcode } from '../src/opcode'

test('party finder segments preserve all four fixed-size listings and 64-bit fields', () => {
  const bytes = Buffer.alloc(1616)
  bytes.writeUInt32LE(0x80000000, 0)
  bytes.fill(0xa5, 4, 12)
  bytes.writeUInt16LE(3, 12)
  for (let i = 0; i < 4; i++) {
    const base = 16 + i * 400
    bytes.writeBigUInt64LE((1n << 60n) + BigInt(i), base)
    bytes.writeBigUInt64LE((1n << 61n) + BigInt(i), base + 8)
    bytes.writeBigUInt64LE((1n << 63n) + BigInt(i), base + 16)
    bytes.writeUInt32LE(4, base + 0x1c)
    bytes.writeUInt16LE(42, base + 0x20)
    bytes.writeUInt16LE(2, base + 0x22)
    bytes.writeUInt16LE(31, base + 0x2e)
    bytes[base + 0x38] = 8
    bytes[base + 0x39] = 1
    bytes[base + 0x3a] = 4
    bytes[base + 0x3b] = 7
    bytes[base + 0x3c] = 2
    bytes.writeInt32LE(-123, base + 0x40)
    bytes.writeUInt16LE(65535, base + 0x44)
    bytes.fill(0x5a, base + 0x46, base + 0x4c)
    bytes.writeUInt16LE(123 + i, base + 0x4c)
    bytes.writeUInt16LE(32, base + 0x4e)
    bytes.writeUInt16LE(33, base + 0x50)
    bytes[base + 0x52] = 3
    bytes[base + 0x53] = 8
    bytes[base + 0x54] = i + 1
    bytes[base + 0x56] = 0x24
    bytes[base + 0x57] = 1
    bytes[base + 0x58] = 3
    for (let slot = 0; slot < 8; slot++) {
      bytes.writeBigUInt64LE(1n << BigInt(slot * 9), base + 0x60 + slot * 8)
      bytes[base + 0xa0 + slot] = 19 + slot
    }
    bytes.write(`测试${i}\0ignored`, base + 0xa8, 'utf8')
    bytes.write(`Synthetic listing ${i}\0ignored`, base + 0xc8, 'utf8')
    bytes.fill(0xc3, base + 0x188, base + 0x190)
  }
  const packet = new PartyFinderList(bytes)
  assert.equal(PacketMap[NormalizedOpcode.PartyFinderList], PartyFinderList)
  assert.equal(PartyFinderList.byteLength, 1616)
  assert.equal(PartyFinderListing.byteLength, 400)
  assert.equal(packet.unknown0, 0x80000000)
  assert.deepEqual(packet.unknown4, Buffer.alloc(8, 0xa5))
  assert.equal(packet.segmentIndex, 3)
  assert.equal(packet.entries.length, 4)
  packet.entries.forEach((entry, i) => {
    assert.equal(entry.listingId, (1n << 60n) + BigInt(i))
    assert.equal(entry.accountId, (1n << 61n) + BigInt(i))
    assert.equal(entry.contentId, (1n << 63n) + BigInt(i))
    assert.equal(entry.category, 4)
    assert.equal(entry.duty, 42)
    assert.equal(entry.dutyType, 2)
    assert.equal(entry.worldId, 31)
    assert.equal(entry.objectiveFlags, 8)
    assert.equal(entry.beginnersWelcome, 1)
    assert.equal(entry.completionStatusFlags, 4)
    assert.equal(entry.dutyFinderSettings, 7)
    assert.equal(entry.lootRule, 2)
    assert.equal(entry.unknownTimestamp, -123)
    assert.equal(entry.secondsRemaining, 65535)
    assert.deepEqual(entry.unknown46, Buffer.alloc(6, 0x5a))
    assert.equal(entry.minimumItemLevel, 123 + i)
    assert.equal(entry.homeWorldId, 32)
    assert.equal(entry.currentWorldId, 33)
    assert.equal(entry.clientLanguage, 3)
    assert.equal(entry.totalSlots, 8)
    assert.equal(entry.slotsFilled, i + 1)
    assert.equal(entry.joinConditionFlags, 0x24)
    assert.equal(entry.isAlliance, 1)
    assert.equal(entry.numberOfParties, 3)
    assert.deepEqual(entry.slotFlags, Array.from({ length: 8 }, (_, s) => 1n << BigInt(s * 9)))
    assert.deepEqual(entry.jobsPresent, Array.from({ length: 8 }, (_, s) => 19 + s))
    assert.equal(entry.name, `测试${i}`)
    assert.equal(entry.description, `Synthetic listing ${i}`)
    assert.deepEqual(entry.unknown188, Buffer.alloc(8, 0xc3))
  })
  assert.throws(() => new PartyFinderList(bytes.subarray(0, 1615)), RangeError)
  assert.throws(() => new PartyFinderListing(bytes.subarray(0, 399)), RangeError)
})

test('empty final segments and unterminated strings stay within their fixed fields', () => {
  const bytes = Buffer.alloc(1616)
  const empty = new PartyFinderList(bytes)
  assert.equal(empty.segmentIndex, 0)
  assert.deepEqual(empty.entries.map(entry => entry.listingId), [0n, 0n, 0n, 0n])
  const base = 16 + 3 * 400
  bytes.fill(0x41, base + 0xa8, base + 0xc8)
  bytes.fill(0x42, base + 0xc8, base + 0x188)
  bytes.fill(0x43, base + 0x188)
  const entry = new PartyFinderList(bytes).entries[3]
  assert.equal(entry.name, 'A'.repeat(32))
  assert.equal(entry.description, 'B'.repeat(192))
})
