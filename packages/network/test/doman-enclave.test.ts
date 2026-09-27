import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PacketMap } from '../src/definitions/ipc'
import { DomanEnclaveState } from '../src/definitions/ipc/doman-enclave'
import { NormalizedOpcode } from '../src/opcode'

test('Doman state decodes independent fields and converts the reimbursement percentage', () => {
  // Entirely synthetic values, including nonzero unknown bytes.
  const bytes = Buffer.alloc(16, 0xa5)
  bytes[0] = 12
  bytes[1] = 1
  bytes[5] = 2
  bytes[6] = 1
  bytes[7] = 0x5a
  bytes.writeUInt16LE(54321, 8)
  for (const donated of [0, 1234, 2468, 65535]) {
    bytes.writeUInt16LE(donated, 2)
    for (const factor of [0, 35, 255]) {
      bytes[4] = factor
      const packet = new DomanEnclaveState(bytes)
      assert.equal(packet.currentMilestone, 12)
      assert.equal(packet.isAcceptingDonations, 1)
      assert.equal(packet.donated, donated)
      assert.equal(packet.priceRatioPercent, factor + 100)
      assert.equal(packet.refreshUi, 2)
      assert.equal(packet.refreshZone, 1)
      assert.equal(packet.unknown7, 0x5a)
      assert.equal(packet.allowance, 54321)
      assert.deepEqual(packet.unknownTail, Buffer.alloc(6, 0xa5))
    }
  }
  assert.equal(DomanEnclaveState.byteLength, 16)
  assert.equal(PacketMap[NormalizedOpcode.DomanEnclaveState], DomanEnclaveState)
  assert.equal(new DomanEnclaveState(Buffer.alloc(16)).priceRatioPercent, 100)
  assert.throws(() => new DomanEnclaveState(Buffer.alloc(15)), RangeError)
})
