import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setTimeout } from 'node:timers/promises'
import { Origin, type DeucalionPacket } from 'pcap'
import { Forwarder } from '../src/forwarder.mjs'
const packet: DeucalionPacket = {
  origin: Origin.Client,
  header: {
    sourceActor: 1,
    targetActor: 2,
    ipcTimestamp: 3n,
    reserved: 0,
    type: 123,
    padding: 0,
    serverId: 4,
    timestamp: 5,
    padding1: 0,
  },
  data: Buffer.alloc(8),
}
test('forwarder binds distinct loopback endpoints and can repeatedly stop and start', async () => {
  const f = new Forwarder()
  try {
    for (let round = 0; round < 3; round++) {
      await f.start()
      assert(
        f.status.running && f.status.clientPort > 0 && f.status.serverPort > 0,
      )
      f.write(packet)
      f.write({ ...packet, origin: Origin.Server })
      f.write({ ...packet, data: Buffer.alloc(65507) })
      await setTimeout(30)
      assert.equal(f.status.sent, 1)
      assert.equal(f.status.received, 1)
      assert.equal(f.status.dropped, 1)
      await f.stop()
      await f.stop()
      assert.equal(f.status.running, false)
    }
  } finally {
    await f.stop()
  }
})
