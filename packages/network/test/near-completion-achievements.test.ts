import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PacketMap } from '../src/definitions/ipc'
import { NearCompletionAchievements } from '../src/definitions/ipc/achievement'
import { NormalizedOpcode } from '../src/opcode'

test('near-completion achievements decode LSB-first membership independently of slot and tail', () => {
  // Artificial bit positions exercise byte boundaries and the bitmap capacity.
  const ids = [0, 7, 8, 19, 4077, 4078, 4079]
  for (const slot of [0, 1]) {
    const bytes = Buffer.alloc(520)
    bytes.writeUInt32LE(slot)
    for (const id of ids) bytes[4 + (id >> 3)] |= 1 << (id & 7)
    bytes.fill(0xa5, 514)
    const packet = new NearCompletionAchievements(bytes)
    assert.equal(packet.slot, slot)
    assert.deepEqual(packet.achievementIds, ids)
    assert.deepEqual(packet.unknownTail, Buffer.alloc(6, 0xa5))
    assert.deepEqual(new NearCompletionAchievements(Buffer.concat([bytes, Buffer.alloc(8, 0xff)])).achievementIds, ids)
  }
  assert.equal(NearCompletionAchievements.byteLength, 520)
  assert.equal(PacketMap[NormalizedOpcode.NearCompletionAchievements], NearCompletionAchievements)
  assert.deepEqual(new NearCompletionAchievements(Buffer.alloc(520)).achievementIds, [])
  assert.throws(() => new NearCompletionAchievements(Buffer.alloc(519)), RangeError)
})
