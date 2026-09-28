import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PacketMap } from '../src/definitions/ipc'
import { PlayerSetup } from '../src/definitions/ipc/player-setup'
import { CN_7_56a } from '../src/opcode/cn-7.56a'
import { FieldType } from '../src/struct/field-type.enum'
import { fieldLength } from '../src/struct/helper'
import type { Struct, StructConstructor } from '../src/struct/struct'
import { getChildren, getFields } from '../src/struct/struct.decorator'

// All payloads are constructed from protocol boundaries, never from a capture.
const minimumLength = 2951

test('PlayerSetup registry, minimum length and optional unknown tail', () => {
  assert.equal(PacketMap.PlayerSetup, PlayerSetup)
  assert.deepEqual(CN_7_56a[0x0093], [{ type: 'PlayerSetup', outgoing: false }])
  assert.equal(PlayerSetup.byteLength, minimumLength)
  const packet = new PlayerSetup(Buffer.alloc(minimumLength))
  assert.equal(packet.unknownTail.length, 0)
  assert.deepEqual(packet.completion.caughtFish, [])
  assert.deepEqual(packet.content.completedMiscContent, [])
  assert.throws(() => new PlayerSetup(Buffer.alloc(minimumLength - 1)), RangeError)
  const extended = Buffer.alloc(minimumLength + 7)
  extended.fill(0xab, minimumLength)
  assert.deepEqual(new PlayerSetup(extended).unknownTail, Buffer.alloc(7, 0xab))
})

test('PlayerSetup identity, unsigned counters and signed timestamps keep their wire widths', () => {
  const bytes = Buffer.alloc(minimumLength)
  const syntheticId = (1n << 63n) + 123n
  bytes.writeBigUInt64LE(syntheticId, 0)
  bytes.writeUInt32LE(0xfedcba98, 24)
  bytes.writeUInt32LE(0xffffffff, 28)
  bytes.writeUInt32LE(345, 32)
  bytes.writeUInt32LE(678, 40)
  bytes.writeUInt32LE(901, 44)
  bytes.writeUInt32LE(234, 48)
  bytes.writeInt32LE(-1, 60)
  bytes.writeInt32LE(-2147483648, 64)
  bytes.writeFloatLE(12.75, 80)
  bytes.writeInt32LE(-42, 88)
  bytes.writeUInt16LE(0x8123, 104)
  bytes[138] = 9
  bytes[139] = 2
  bytes.writeUInt16LE(0x1234, 144)
  bytes[146] = 0x80
  bytes[158] = 3
  bytes[159] = 8
  bytes.writeInt32LE(-987, 352)
  const { header, progress } = new PlayerSetup(bytes)
  assert.equal(header.contentId, syntheticId)
  assert.equal(header.entityId, 0xfedcba98)
  assert.equal(header.restedExp, 0xffffffff)
  assert.equal(header.companionCurrentExp, 345)
  assert.equal(header.fishCaught, 678)
  assert.equal(header.fishingBait, 901)
  assert.equal(header.spearfishCaught, 234)
  assert.equal(header.squadronMissionCompletionTimestamp, -1)
  assert.equal(header.squadronTrainingCompletionTimestamp, -2147483648)
  assert.equal(header.companionTimeLeft, 12.75)
  assert.equal(header.unknownTimestamp58, -42)
  assert.equal(header.playerCommendations, 0x8123)
  assert.equal(header.currentJob, 9)
  assert.equal(header.firstClass, 2)
  assert.equal(header.homepoint, 0x1234)
  assert.equal(header.questSpecialFlags, 0x80)
  assert.equal(header.relicId, 3)
  assert.equal(header.relicNoteId, 8)
  assert.equal(progress.unknownTimestamp160, -987)
})

test('parallel progress arrays preserve their final slots and fish sizes keep tenths', () => {
  const bytes = Buffer.alloc(minimumLength)
  for (let i = 0; i < 35; i++) {
    bytes.writeUInt32LE(0x80000000 + i, 188 + i * 4)
    bytes.writeUInt16LE(40 + i, 356 + i * 2)
  }
  for (let i = 0; i < 44; i++) {
    bytes.writeUInt16LE(i % 2 ? 20000 + i : i + 1, 458 + i * 2)
    bytes.writeUInt16LE(i * 13, 546 + i * 2)
  }
  bytes.writeUInt32LE(789, 328)
  bytes.writeUInt32LE(456, 348)
  bytes.writeUInt16LE(10, 426 + 7 * 2)
  bytes.writeUInt16LE(20, 442 + 7 * 2)
  bytes.writeUInt16LE(321, 634 + 19 * 2)
  bytes.writeUInt16LE(654, 690 + 11 * 2)
  const { progress } = new PlayerSetup(bytes)
  assert.deepEqual(progress.exp, Array.from({ length: 35 }, (_, i) => 0x80000000 + i))
  assert.deepEqual(progress.level, Array.from({ length: 35 }, (_, i) => 40 + i))
  assert.deepEqual(progress.pvpGrandCompanyExp, [789, 0, 0])
  assert.deepEqual(progress.frontlineTotalPlacements, [0, 0, 456])
  assert.equal(progress.festivalIds[7], 10)
  assert.equal(progress.festivalPhases[7], 20)
  assert.equal(progress.fishRecordIds.length, 44)
  assert.equal(progress.fishRecordIds[43], 20043)
  assert.deepEqual(progress.fishRecordSizes, Array.from({ length: 44 }, (_, i) => (i * 13) / 10))
  assert.equal(progress.beastTribeReputation[19], 321)
  assert.equal(progress.satisfactionValues[11], 654)
})

test('text slots, unknown intervals and GCSupply bytes remain bounded and lossless', () => {
  const bytes = Buffer.alloc(minimumLength)
  const ranges = [[8, 8], [16, 8], [54, 2], [92, 2], [182, 1], [186, 2],
    [876, 32], [1890, 4], [1894, 11], [2259, 28]]
  for (const [offset, length] of ranges) bytes.fill(0xa5, offset, offset + length)
  bytes.fill('C', 714, 735)
  bytes[735] = 2
  bytes[736] = 4
  bytes[737] = 6
  bytes.fill('N', 844, 876)
  const { header, progress, unlocks, completion } = new PlayerSetup(bytes)
  assert.equal(progress.companionName, 'C'.repeat(21))
  assert.deepEqual(progress.companionSkillRanks, [2, 4, 6])
  assert.equal(unlocks.nickname, 'N'.repeat(32))
  const buffers = [header.unknown8, header.unknown10, header.unknown36, header.unknown5C,
    header.unknownB6, header.unknownBA, unlocks.unknownOnlineId,
    unlocks.unknownGcSupply762, unlocks.unknownGcSupply766, completion.unknown8D3]
  buffers.forEach((buffer, i) => assert.deepEqual(buffer, Buffer.alloc(ranges[i][1], 0xa5)))
  bytes.write('Synthetic\0ignored', 844)
  assert.equal(new PlayerSetup(bytes).unlocks.nickname, 'Synthetic')
})

test('fishing, map discovery and split aether-current bitmaps use independent LSB-first indices', () => {
  const bytes = Buffer.alloc(minimumLength)
  const fields = [
    [1905, 191, 'caughtFish'], [2096, 43, 'discoveredFishingSpotIndices'],
    [2139, 38, 'caughtSpearfishIndices'], [2177, 9, 'discoveredSpearfishingSpotIndices'],
  ] as const
  for (const [offset, length] of fields) {
    bytes[offset] = 5
    bytes[offset + length - 1] = 0x80
  }
  bytes[1044] = 1
  bytes[1367] = 0x80
  bytes[1368] = 2
  bytes[1563] = 0x40
  bytes[166] = 0x81
  bytes[2543] = 2
  bytes[2545] = 0x80
  bytes[2608 + 111] = 0x80
  bytes[2950] = 0x80
  const { header, unlocks, completion, content } = new PlayerSetup(bytes)
  for (const [, length, key] of fields) assert.deepEqual(completion[key], [0, 2, length * 8 - 1])
  assert.deepEqual(unlocks.mapDiscoveryFirst, [0, 2591])
  assert.deepEqual(unlocks.mapDiscoverySecond, [1, 1566])
  assert.deepEqual(header.aetherCurrentZoneCompletionFirst, [0, 7])
  assert.deepEqual(content.aetherCurrentZoneCompletionRemaining, [1, 23])
  assert.deepEqual(content.orchestrionList, [895])
  assert.deepEqual(content.completedMiscContent, [39])
})

test('packed quest state retains unknown bits and byte arrays are not interpreted as bitmaps', () => {
  const bytes = Buffer.alloc(minimumLength)
  bytes.writeUInt32LE(0xe4e4e4e4, 72)
  bytes.writeUInt32LE(0x80002340, 76)
  bytes.writeUInt16LE(0xc123, 112)
  bytes.writeUInt16LE(0x8001, 120)
  bytes[2189 + 19] = 0x85
  bytes[2209] = 3
  bytes[2220] = 254
  bytes[2228] = 255
  bytes[2287 + 9] = 7
  bytes.writeUInt16LE(0x8003, 2297)
  bytes[2724] = 0x83
  bytes[2734] = 0xf1
  bytes[2750] = 6
  bytes[2754] = 8
  bytes[2766] = 9
  bytes[2778] = 4
  const { header, completion, content } = new PlayerSetup(bytes)
  assert.equal(header.weeklyBingoTaskStatus, 0xe4e4e4e4)
  assert.equal(header.weeklyBingoFlags, 0x80002340)
  assert.equal(header.animaWeapon7Work, 0xc123)
  assert.equal(header.weeklyBingoStickers, 0x8001)
  assert.equal(completion.beastTribeRankFlags[19], 0x85)
  assert.equal(completion.rouletteCompletion.length, 12)
  assert.equal(completion.rouletteCompletion[0], 3)
  assert.equal(completion.rouletteCompletion[11], 254)
  assert.equal(completion.selectedPoses[7], 255)
  assert.equal(completion.relicMonsterProgress[9], 7)
  assert.equal(completion.relicObjectiveProgress, 0x8003)
  assert.equal(content.animaWeapon5Work[0], 0x83)
  assert.equal(content.animaWeapon5Work[10], 0xf1)
  assert.equal(content.weeklyBingoOrderData[15], 6)
  assert.equal(content.weeklyBingoRewardData[3], 8)
  assert.equal(content.satisfactionRanks[0], 0)
  assert.equal(content.satisfactionRanks[11], 9)
  assert.equal(content.satisfactionUsedAllowances[11], 4)
})

test('MobHunt reads interleaved first slots and all five groups without losing packed bits', () => {
  const bytes = Buffer.alloc(minimumLength)
  bytes[2342] = 12
  bytes[2343] = 0x83
  bytes[2344] = 0xe5
  bytes[2350] = 0x9a
  for (let i = 0; i < 5; i++) bytes[2345 + i] = i + 1
  for (let group = 0; group < 5; group++) {
    const start = 2351 + group * 23
    for (let slot = 0; slot < 3; slot++) {
      bytes[start + slot * 7] = 0x80 + group * 3 + slot
      bytes[start + slot * 7 + 1] = 20 + group * 3 + slot
      for (let target = 0; target < 5; target++) bytes[start + slot * 7 + 2 + target] = target + group + slot
    }
    bytes[start + 21] = 0xe0 + group
    bytes[start + 22] = 0x80 + (group << 2) + 3
  }
  bytes[2466] = 1
  const { hunts, content } = new PlayerSetup(bytes)
  assert.equal(hunts.dailyAvailableId, 12)
  assert.equal(hunts.dailyObtainedIdAndFlags, 0x83)
  assert.equal(hunts.eliteObtainedIdAndFlags, 0xe5)
  assert.equal(hunts.eliteAvailableIdAndKillCount, 0x9a)
  assert.deepEqual(hunts.dailyKillCounts, [1, 2, 3, 4, 5])
  assert.equal(hunts.groups.length, 5)
  hunts.groups.forEach((group, i) => {
    assert.equal(group.daily.length, 3)
    group.daily.forEach((daily, j) => {
      assert.equal(daily.obtainedIdAndFlags, 0x80 + i * 3 + j)
      assert.equal(daily.availableId, 20 + i * 3 + j)
      assert.deepEqual(daily.killCounts, Array.from({ length: 5 }, (_, k) => k + i + j))
    })
    assert.equal(group.elite.obtainedIdAndFlags, 0xe0 + i)
    assert.equal(group.elite.availableIdAndKillCount, 0x80 + (i << 2) + 3)
  })
  assert.deepEqual(content.unlockedTripleTriadCards, [0])
})

test('every byte in the known payload has exactly one leaf field, including unknown intervals', () => {
  const coverage = new Uint8Array(minimumLength)
  function visit(ctor: StructConstructor, base: number) {
    const fields = getFields(ctor.prototype as Struct)
    const children = getChildren(ctor.prototype as Struct)
    for (const [key, metadata] of Object.entries(fields ?? {})) {
      assert(metadata)
      const offset = base + metadata.offset
      const length = fieldLength(metadata.type, metadata.length)
      const child = children?.[key]
      if (typeof child === 'function') {
        assert(child.byteLength)
        for (let i = 0; i < length; i += child.byteLength) visit(child, offset + i)
      } else {
        // The open-ended tail contributes no bytes to the minimum payload.
        for (let i = offset; i < offset + length; i++) {
          assert(i < coverage.length, `${ctor.name}.${key} exceeds payload`)
          coverage[i]++
        }
        if (metadata.type === FieldType.array) assert.equal(length % (child?.byteLength ?? 0), 0)
      }
    }
  }
  visit(PlayerSetup, 0)
  coverage.forEach((count, offset) => assert.equal(count, 1, `coverage at ${offset}`))
})
