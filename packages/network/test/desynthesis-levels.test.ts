import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PacketMap } from '../src/definitions/ipc'
import { DesynthesisLevels } from '../src/definitions/ipc/desynthesis-levels'
import { NormalizedOpcode } from '../src/opcode'

test('desynthesis levels decode unsigned little-endian hundredths in crafting-job order', () => {
  // Synthetic boundary and fractional values, unrelated to captured traffic.
  const raw = [0, 1, 100, 101, 12345, 23456, 34567, 0xffffffff]
  const jobs = ['carpenter', 'blacksmith', 'armorer', 'goldsmith', 'leatherworker', 'weaver', 'alchemist', 'culinarian'] as const
  const bytes = Buffer.alloc(32)
  raw.forEach((value, index) => bytes.writeUInt32LE(value, index * 4))
  const packet = new DesynthesisLevels(bytes)
  assert.equal(DesynthesisLevels.byteLength, 32)
  assert.equal(PacketMap[NormalizedOpcode.DesynthesisLevels], DesynthesisLevels)
  for (const [index, job] of jobs.entries()) {
    assert.equal(packet[job], raw[index] / 100, job)
  }
  assert.throws(() => new DesynthesisLevels(bytes.subarray(0, 31)), RangeError)
})
