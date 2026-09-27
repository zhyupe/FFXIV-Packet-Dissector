import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  EventHandlerReturn,
  PacketMap,
  ResumeEventScene2,
  UpdateEventScene2,
  UpdateEventScene4,
  UpdateEventScene8,
  UpdateEventScene16,
  YieldEventScene2,
  YieldEventScene4,
  YieldEventScene8,
} from '../src/definitions/ipc'
import { NormalizedOpcode } from '../src/opcode'

const variants = [
  [NormalizedOpcode.UpdateEventScene2, UpdateEventScene2, 2, true],
  [NormalizedOpcode.UpdateEventScene4, UpdateEventScene4, 4, true],
  [NormalizedOpcode.UpdateEventScene8, UpdateEventScene8, 8, true],
  [NormalizedOpcode.UpdateEventScene16, UpdateEventScene16, 16, true],
  [NormalizedOpcode.ResumeEventScene2, ResumeEventScene2, 2, false],
  [NormalizedOpcode.YieldEventScene2, YieldEventScene2, 2, false],
  [NormalizedOpcode.YieldEventScene4, YieldEventScene4, 4, false],
  [NormalizedOpcode.YieldEventScene8, YieldEventScene8, 8, false],
] as const

test('event scene families distinguish parameter counts from yield IDs and preserve capacity', () => {
  for (const [name, Type, capacity, update] of variants) {
    const length = 8 + 4 * capacity
    const bytes = Buffer.alloc(length)
    bytes.writeUInt32LE(0x12340056, 0)
    bytes.writeUInt16LE(0x4321, 4)
    bytes[6] = update ? capacity - 1 : 0xa5
    bytes[7] = update ? 0x5a : capacity - 1
    const params = Array.from({ length: capacity }, (_, index) => 0x80000000 + index)
    params.forEach((value, index) => bytes.writeUInt32LE(value, 8 + index * 4))
    const packet = new Type(bytes) as unknown as {
      header: { eventId: number; scene: number; paramCount: number; unknown?: number; resumeId?: number; yieldId?: number }
      entities: number[]
    }
    assert.equal(Type.byteLength, length, name)
    assert.equal(PacketMap[name], Type)
    assert.equal(packet.header.eventId, 0x12340056)
    assert.equal(packet.header.scene, 0x4321)
    assert.equal(packet.header.paramCount, capacity - 1)
    assert.equal(
      update ? packet.header.unknown : packet.header.resumeId ?? packet.header.yieldId,
      update ? 0x5a : 0xa5,
    )
    assert.deepEqual(packet.entities, params)
    assert.throws(() => new Type(bytes.subarray(0, length - 1)), RangeError)
    assert.doesNotThrow(() => new Type(Buffer.alloc(length)))
  }
})

test('event completion preserves the error byte and two uint32 return parameters', () => {
  const bytes = Buffer.alloc(16)
  bytes.writeUInt32LE(0x12340056, 0)
  bytes.writeUInt16LE(0x4321, 4)
  bytes[6] = 0xa5
  bytes[7] = 2
  bytes.writeUInt32LE(0x89abcdef, 8)
  bytes.writeUInt32LE(0xfedcba98, 12)
  const packet = new EventHandlerReturn(bytes)
  assert.equal(EventHandlerReturn.byteLength, 16)
  assert.equal(PacketMap[NormalizedOpcode.EventHandlerReturn], EventHandlerReturn)
  assert.equal(packet.eventId, 0x12340056)
  assert.equal(packet.scene, 0x4321)
  assert.equal(packet.errorCode, 0xa5)
  assert.equal(packet.paramCount, 2)
  assert.deepEqual(packet.params, [0x89abcdef, 0xfedcba98])
  assert.equal(new EventHandlerReturn(Buffer.alloc(16)).paramCount, 0)
  assert.throws(() => new EventHandlerReturn(bytes.subarray(0, 15)), RangeError)
})
