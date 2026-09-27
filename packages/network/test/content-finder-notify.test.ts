import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ContentFinderNotify, PacketMap } from '../src/definitions/ipc'
import { NormalizedOpcode } from '../src/opcode'

test('queue update preserves flags, unknown bytes and all five uint32 duty entries', () => {
  const bytes = Buffer.alloc(40)
  bytes[0] = 2
  bytes[1] = 19
  bytes[2] = 0x0a
  bytes.fill(0xa5, 3, 8)
  const flags = 0x0123456789abcdefn
  bytes.writeBigUInt64LE(flags, 8)
  bytes[16] = 7
  bytes.fill(0x5a, 17, 19)
  bytes[19] = 0x81
  const duties = [42, 0, 0x12345678, 0x80000001, 0xffffffff]
  duties.forEach((id, i) => bytes.writeUInt32LE(id, 20 + i * 4))
  const packet = new ContentFinderNotify(bytes)
  assert.equal(ContentFinderNotify.byteLength, 40)
  assert.equal(PacketMap[NormalizedOpcode.ContentFinderNotify], ContentFinderNotify)
  assert.equal(packet.type, 2)
  assert.equal(packet.classJob, 19)
  assert.equal(packet.languageFlags, 0x0a)
  assert.deepEqual(packet.unknown1, Buffer.alloc(5, 0xa5))
  assert.equal(packet.flags, flags)
  assert.equal(packet.roulette, 7)
  assert.deepEqual(packet.unknown2, Buffer.alloc(2, 0x5a))
  assert.equal(packet.queueStartFlags, 0x81)
  assert.deepEqual(packet.contentFinderNotifyInstance.map(entry => entry.content), duties)
  bytes[19] = 0x80
  assert.equal(new ContentFinderNotify(bytes).queueStartFlags & 1, 0)
  assert.deepEqual(
    new ContentFinderNotify(Buffer.alloc(40)).contentFinderNotifyInstance.map(entry => entry.content),
    [0, 0, 0, 0, 0],
  )
  assert.throws(() => new ContentFinderNotify(bytes.subarray(0, 39)), RangeError)
})
