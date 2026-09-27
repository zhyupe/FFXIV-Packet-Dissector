import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PlayerSpawn } from '../src/definitions/ipc/player-spawn'

test('player spawn reads its own header and all variable-looking sections at fixed boundaries', () => {
  // Generated independently of any capture; identifiers and text are synthetic.
  const bytes = Buffer.alloc(0x298)
  bytes.writeBigUInt64LE(0x0102030405060708n, 0)
  bytes.writeBigUInt64LE(0x1112131415161718n, 8)
  bytes.writeUInt16LE(27, 0x10)
  bytes.writeUInt16LE(51, 0x12)
  bytes.writeUInt16LE(101, 0x14)
  bytes.writeUInt16LE(202, 0x16)
  bytes[0x1b] = 7
  bytes.writeUInt32LE(123456, 0x6c)
  bytes.writeUInt32LE(98765, 0x70)
  bytes.writeUInt16LE(7654, 0x7a)
  bytes.writeUInt16LE(4321, 0x7c)
  bytes.writeUInt16LE(0x1234, 0x7e)
  bytes.writeUInt16LE(0x2345, 0x84)
  bytes.writeUInt16LE(0x3456, 0x86)
  bytes[0x8e] = 23
  bytes[0x96] = 87
  bytes[0x97] = 19
  for (let i = 0; i < 30; i++) {
    const offset = 0xa8 + i * 12
    bytes.writeUInt16LE(1000 + i, offset)
    bytes.writeUInt16LE(200 + i, offset + 2)
    bytes.writeFloatLE(i + 0.5, offset + 4)
    bytes.writeUInt32LE(i + 1, offset + 8)
  }
  bytes.writeFloatLE(1.25, 0x210)
  bytes.writeFloatLE(-2.5, 0x214)
  bytes.writeFloatLE(3.75, 0x218)
  for (let i = 0; i < 10; i++) {
    bytes.writeUInt32LE(0x80000000 + i, 0x21c + i * 4)
    bytes[0x244 + i] = i + 10
  }
  bytes.writeUInt16LE(321, 0x24e)
  bytes.writeUInt16LE(654, 0x250)
  bytes.write('Synthetic Player', 0x252)
  bytes.fill(0xa5, 0x272, 0x28c)
  bytes.write('TEST', 0x28c)
  bytes.fill(0x5a, 0x292)

  const packet = new PlayerSpawn(bytes)
  assert.equal(PlayerSpawn.byteLength, 664)
  assert.equal(packet.accountId, 0x0102030405060708n)
  assert.equal(packet.contentId, 0x1112131415161718n)
  assert.equal(packet.title, 27)
  assert.equal(packet.timelineBaseOverride, 51)
  assert.equal(packet.currentWorldId, 101)
  assert.equal(packet.homeWorldId, 202)
  assert.equal(packet.onlineStatus, 7)
  assert.equal(packet.hpMax, 123456)
  assert.equal(packet.hpCur, 98765)
  assert.equal(packet.resourcePointsMax, 7654)
  assert.equal(packet.resourcePoints, 4321)
  assert.equal(packet.behavior, 0x1234)
  assert.equal(packet.currentMount, 0x2345)
  assert.equal(packet.activeMinion, 0x3456)
  assert.equal(packet.spawnIndex, 23)
  assert.equal(packet.level, 87)
  assert.equal(packet.classJob, 19)
  assert.equal(packet.statusEffects.length, 30)
  for (let i = 0; i < 30; i++) {
    assert.deepEqual({ ...packet.statusEffects[i] }, {
      id: 1000 + i, extra: 200 + i, duration: i + 0.5, actorId: i + 1,
    })
  }
  assert.deepEqual({ ...packet.position }, { x: 1.25, y: -2.5, z: 3.75 })
  assert.deepEqual(packet.models, Array.from({ length: 10 }, (_, i) => 0x80000000 + i))
  assert.deepEqual(packet.modelStain2Ids, Array.from({ length: 10 }, (_, i) => i + 10))
  assert.deepEqual(packet.glassesIds, [321, 654])
  assert.equal(packet.nickname, 'Synthetic Player')
  assert.deepEqual(packet.look, Buffer.alloc(26, 0xa5))
  assert.equal(packet.fcTag, 'TEST')
  assert.deepEqual(packet.unknownTail, Buffer.alloc(6, 0x5a))
  assert.throws(() => new PlayerSpawn(bytes.subarray(0, 663)), RangeError)
})

test('player name, customization and free company tag do not overlap', () => {
  const bytes = Buffer.alloc(664, 0xa5)
  bytes.fill('N', 0x252, 0x272)
  bytes.write('测试', 0x28c) // Six UTF-8 bytes, without a terminator in the field.
  const packet = new PlayerSpawn(bytes)
  assert.equal(packet.nickname, 'N'.repeat(32))
  assert.deepEqual(packet.look, Buffer.alloc(26, 0xa5))
  assert.equal(packet.fcTag, '测试')
  assert.deepEqual(packet.unknownTail, Buffer.alloc(6, 0xa5))
})
