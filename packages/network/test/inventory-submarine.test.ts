import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  EventHandlerReturn, EventHandlerReturn4, Init, InventoryTransaction,
  InventoryTransactionFinish, ItemInfo, ItemLocation, PacketMap, Ping,
  SubmarineProgressionStatus, UpdateInventorySlot,
} from '../src/definitions/ipc'
import { CN_7_56a } from '../src/opcode/cn-7.56a'
import { NormalizedOpcode } from '../src/opcode'

test('submarine bitmaps cover all 160 points independently and preserve unknown tail', () => {
  const bytes = Buffer.alloc(48)
  bytes[0] = 3
  bytes[1] = 1
  bytes[20] = 0x80
  bytes[21] = 2
  bytes[40] = 0x40
  bytes.fill(0xa6, 41)
  const packet = new SubmarineProgressionStatus(bytes)
  assert.deepEqual(packet.unlockedSectors, [0, 159])
  assert.deepEqual(packet.exploredSectors, [1, 158])
  assert.deepEqual(packet.unknown41, Buffer.alloc(7, 0xa6))
})

test('inventory updates distinguish durability, spiritbond, uint32 glamour and two dyes', () => {
  for (const Type of [ItemInfo, UpdateInventorySlot]) {
    const bytes = Buffer.alloc(64)
    bytes.writeUInt16LE(ItemLocation.HousingInteriorPlacedItems2, 8)
    bytes.writeUInt16LE(7, 10)
    bytes.writeUInt32LE(700001, 16)
    bytes.writeUInt16LE(12000, 34)
    bytes.writeUInt16LE(4321, 36)
    bytes.writeUInt16LE(0xabcd, 38)
    bytes.writeUInt32LE(700002, 40)
    bytes[59] = 17
    bytes[60] = 23
    bytes.fill(0xa6, 61)
    const packet = new Type(bytes)
    assert.equal(packet.containerId, 25004)
    assert.equal(packet.slot, 7)
    assert.equal(packet.condition, 12000)
    assert.equal(packet.spiritbond, 4321)
    assert.equal(packet.glamourCatalogId, 700002)
    assert.equal(packet.stain, 17)
    assert.equal(packet.stain2, 23)
    assert.equal(packet.unknown38, 0xabcd)
    assert.deepEqual(packet.unknown61, Buffer.alloc(3, 0xa6))
    bytes.writeUInt16LE(0, 34)
    assert.equal(new Type(bytes).condition, 0)
  }
})

test('inventory transactions retain source and destination slots and resulting quantities', () => {
  const bytes = Buffer.alloc(48)
  bytes.writeUInt32LE(0x200, 4)
  bytes.writeUInt32LE(ItemLocation.Inventory0, 12)
  bytes.writeInt16LE(-1, 16)
  bytes.fill(0x7f, 18, 20)
  bytes.writeUInt32LE(41, 20)
  bytes.writeUInt32LE(700001, 24)
  bytes.writeUInt32LE(ItemLocation.FreeCompanyPage5, 32)
  bytes.writeInt16LE(37, 36)
  bytes.fill(0x80, 38, 40)
  bytes.writeUInt32LE(59, 40)
  bytes.writeUInt32LE(700002, 44)
  const packet = new InventoryTransaction(bytes)
  assert.equal(packet.slotId, -1)
  assert.equal(packet.stackSize, 41)
  assert.equal(packet.catalogId, 700001)
  assert.equal(packet.targetStorageId, 20004)
  assert.equal(packet.targetSlotId, 37)
  assert.equal(packet.targetStackSize, 59)
  assert.equal(packet.targetCatalogId, 700002)
  assert.deepEqual(packet.unknown38, Buffer.alloc(2, 0x80))
  const finish = Buffer.alloc(16, 0xa6)
  finish[13] = 9
  assert.equal(new InventoryTransactionFinish(finish).packetCount, 9)
})

test('four-parameter event completion preserves signed scene and unused capacity', () => {
  const bytes = Buffer.alloc(24)
  bytes.writeInt16LE(-2, 4)
  bytes[6] = 7
  bytes[7] = 3
  const params = [11, 22, 33, 0xf0000000]
  params.forEach((value, i) => bytes.writeUInt32LE(value, 8 + 4 * i))
  const packet = new EventHandlerReturn4(bytes)
  assert.equal(packet.scene, -2)
  assert.equal(packet.errorCode, 7)
  assert.equal(packet.paramCount, 3)
  assert.deepEqual(packet.params, params)
  assert.equal(EventHandlerReturn.byteLength, 16)
  assert.equal(new EventHandlerReturn(Buffer.alloc(16)).params.length, 2)
})

test('keepalive layouts retain wrapping clock and unknown connection fields', () => {
  const bytes = Buffer.alloc(32, 0xa6)
  bytes.writeUInt32LE(0xfffffffe, 0)
  bytes.writeUInt32LE(45, 4)
  const request = new Ping(bytes)
  assert.equal(request.clientTime, 0xfffffffe)
  assert.equal(request.roundTripTime, 45)
  assert.deepEqual(request.unknown12, Buffer.alloc(16, 0xa6))
  const response = new Init(bytes)
  assert.equal(response.clientTime, 0xfffffffe)
  assert.equal(response.connectionFlag, 0xa6)
  assert.deepEqual(response.unknown12, Buffer.alloc(20, 0xa6))
  assert(!('charId' in response))
})

test('inventory catalog includes all regular pages, content inventories and unknown wire aliases', () => {
  const values = new Set<number>(Object.values(ItemLocation))
  for (const [start, count] of [[10000, 7], [20000, 5], [25003, 12], [27001, 12]] as const) {
    for (let i = 0; i < count; i++) assert(values.has(start + i))
  }
  for (const id of [2014, 26000, 26001, 5000, 5001]) assert(values.has(id))
  assert.equal(values.size, Object.keys(ItemLocation).length)
  assert.equal(ItemLocation.Inventory0, 0)
  assert.equal(ItemLocation.ArmouryRing, 3300)
})

test('registered payloads reject truncation and accept zero values and trailing extensions', () => {
  for (const [name, Type, length] of [
    [NormalizedOpcode.SubmarineProgressionStatus, SubmarineProgressionStatus, 48],
    [NormalizedOpcode.InventoryTransaction, InventoryTransaction, 48],
    [NormalizedOpcode.InventoryTransactionFinish, InventoryTransactionFinish, 16],
    [NormalizedOpcode.UpdateInventorySlot, UpdateInventorySlot, 64],
    [NormalizedOpcode.ItemInfo, ItemInfo, 64],
    [NormalizedOpcode.EventHandlerReturn4, EventHandlerReturn4, 24],
    [NormalizedOpcode.Ping, Ping, 32],
    [NormalizedOpcode.Init, Init, 32],
  ] as const) {
    assert.equal(PacketMap[name], Type)
    assert.equal(Type.byteLength, length)
    assert.throws(() => new Type(Buffer.alloc(length - 1)), RangeError)
    assert.doesNotThrow(() => new Type(Buffer.alloc(length)))
    assert.doesNotThrow(() => new Type(Buffer.alloc(length + 8)))
  }
  assert.deepEqual(CN_7_56a[0x0346], [{ type: NormalizedOpcode.Ping, outgoing: true }])
  assert((CN_7_56a[0x025f] as {type: string; outgoing: boolean}[]).some(
    entry => entry.type === 'EventHandlerReturn4' && entry.outgoing,
  ))
})
