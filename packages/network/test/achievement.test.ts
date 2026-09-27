import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Achievement, PacketMap } from '../src/definitions/ipc'
import { NormalizedOpcode } from '../src/opcode'

test('achievement bitmap, ordered history and independent auxiliary flags have distinct boundaries', () => {
  // Artificial membership and history, unrelated to any player's achievements.
  const bytes = Buffer.alloc(552)
  const completed = [0, 7, 8, 31, 4077, 4079]
  for (const id of completed) bytes[id >> 3] |= 1 << (id & 7)
  const history = [501, 42, 903, 17, 600]
  history.forEach((id, index) => bytes.writeUInt16LE(id, 510 + index * 2))
  const flags = [0, 7, 8, 127, 207]
  for (const index of flags) bytes[520 + (index >> 3)] |= 1 << (index & 7)
  bytes.fill(0xa5, 546)
  const packet = new Achievement(bytes)
  assert.equal(Achievement.byteLength, 552)
  assert.equal(PacketMap[NormalizedOpcode.Achievement], Achievement)
  assert.deepEqual(packet.completedAchievementIds, completed)
  assert.deepEqual(packet.history, history)
  assert.deepEqual(packet.auxiliaryFlagIndices, flags)
  assert.deepEqual(packet.unknownTail, Buffer.alloc(6, 0xa5))
  const empty = new Achievement(Buffer.alloc(552))
  assert.deepEqual(empty.completedAchievementIds, [])
  assert.deepEqual(empty.history, [0, 0, 0, 0, 0])
  assert.deepEqual(empty.auxiliaryFlagIndices, [])
  assert.throws(() => new Achievement(bytes.subarray(0, 551)), RangeError)
})
