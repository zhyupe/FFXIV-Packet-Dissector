import { Struct } from '@/struct/struct'
import { field, child } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'

const classJobCount = 28

export class PlayerSetup extends Struct {
  @field(FieldType.bytes, 0, 8)
  contentId!: Buffer

  // @field(FieldType.int, 8, 4)
  // unknown8!: number

  // @field(FieldType.int, 12, 4)
  // unknownC!: number

  @field(FieldType.int, 16, 4)
  charId!: number

  @field(FieldType.int, 20, 4)
  restedExp!: number

  @field(FieldType.int, 24, 4)
  companionCurrentExp!: number

  // @field(FieldType.int, 28, 4)
  // unknown1C!: number

  @field(FieldType.int, 32, 4)
  fishCaught!: number

  @field(FieldType.int, 36, 4)
  useBaitCatalogId!: number

  // @field(FieldType.int, 40, 4)
  // unknown28!: number

  // @field(FieldType.int, 44, 2)
  // unknownPvp2C!: number

  // @field(FieldType.int, 46, 2)
  // unknown3!: number

  // @field(FieldType.int, 48, 4)
  // pvpFrontlineOverallCampaigns!: number

  // @field(FieldType.int, 52, 4)
  // unknownTimestamp34!: number

  // @field(FieldType.int, 56, 4)
  // unknownTimestamp38!: number

  // @field(FieldType.int, 60, 4)
  // unknown3C!: number

  // @field(FieldType.int, 64, 4)
  // unknown40!: number

  // @field(FieldType.int, 68, 4)
  // unknown44!: number

  @field(FieldType.float, 72, 4)
  companionTimePassed!: number

  // @field(FieldType.int, 76, 4)
  // unknown4C!: number

  // @field(FieldType.int, 80, 2)
  // unknown50!: number

  // @field(FieldType.int, 82, 2)
  // unknownPvp520!: number

  // @field(FieldType.int, 84, 2)
  // unknownPvp521!: number

  // @field(FieldType.int, 86, 2)
  // unknownPvp522!: number

  // @field(FieldType.int, 88, 2)
  // unknownPvp523!: number

  @field(FieldType.int, 90, 2)
  playerCommendations!: number

  // @field(FieldType.int, 92, 2)
  // unknown5C!: number

  // @field(FieldType.int, 94, 2)
  // unknown5E!: number

  // @field(FieldType.int, 96, 2)
  // pvpFrontlineWeeklyCampaigns!: number

  // @field(FieldType.int, 98, 2)
  // enhancedAnimaGlassProgress!: number

  // @field(FieldType.int, 100, 2)
  // unknown640!: number

  // @field(FieldType.int, 102, 2)
  // unknown641!: number

  // @field(FieldType.int, 104, 2)
  // unknown642!: number

  // @field(FieldType.int, 106, 2)
  // unknown643!: number

  // @field(FieldType.int, 108, 2)
  // pvpRivalWingsTotalMatches!: number

  // @field(FieldType.int, 110, 2)
  // pvpRivalWingsTotalVictories!: number

  // @field(FieldType.int, 112, 2)
  // pvpRivalWingsWeeklyMatches!: number

  // @field(FieldType.int, 114, 2)
  // pvpRivalWingsWeeklyVictories!: number

  @field(FieldType.byte, 116)
  maxLevel!: number

  @field(FieldType.byte, 117)
  expansion!: number

  // @field(FieldType.byte, 118)
  // unknown76!: number

  // @field(FieldType.byte, 119)
  // unknown77!: number

  @field(FieldType.byte, 121)
  race!: number

  @field(FieldType.byte, 122)
  tribe!: number

  @field(FieldType.byte, 123)
  gender!: number

  @field(FieldType.byte, 124)
  currentJob!: number

  @field(FieldType.byte, 125)
  currentClass!: number

  @field(FieldType.byte, 126)
  deity!: number

  @field(FieldType.byte, 127)
  namedayMonth!: number

  @field(FieldType.byte, 128)
  namedayDay!: number

  @field(FieldType.byte, 129)
  cityState!: number

  @field(FieldType.byte, 130)
  homepoint!: number

  // @field(FieldType.byte, 130)
  // unknown82!: number

  // @field(FieldType.byte, 131)
  // petHotBar!: number

  @field(FieldType.byte, 133)
  companionRank!: number

  @field(FieldType.byte, 134)
  companionStars!: number

  @field(FieldType.byte, 135)
  companionSp!: number

  @field(FieldType.byte, 136)
  companionUnk86!: number

  @field(FieldType.byte, 137)
  companionColor!: number

  @field(FieldType.byte, 138)
  companionFavoFeed!: number

  // @field(FieldType.bytes, 138, 5)
  // unknown89!: number

  @field(FieldType.byte, 143)
  hasRelicBook!: number

  @field(FieldType.byte, 144)
  relicBookId!: number

  // @field(FieldType.bytes, 145, 4)
  // unknown900!: number

  // @field(FieldType.byte, 149)
  // craftingMasterMask!: number

  // @field(FieldType.bytes, 150, 14)
  // unknown950!: number

  // @field(FieldType.int, 164, 4)
  // unknown108!: number

  @field(FieldType.array, 168, 4 * classJobCount)
  @child({ type: FieldType.uint, byteLength: 4 })
  exp!: number[]

  @field(FieldType.array, 308, 2 * classJobCount)
  @child({ type: FieldType.uint, byteLength: 2 })
  level!: number[]

  // @field(FieldType.int, 172, 4)
  // unknownPvp110!: number

  // @field(FieldType.int, 176, 4)
  // pvpExp!: number

  // @field(FieldType.int, 180, 4)
  // pvpFrontlineOverallRanks0!: number

  // @field(FieldType.int, 184, 4)
  // pvpFrontlineOverallRanks1!: number

  // @field(FieldType.int, 188, 4)
  // pvpFrontlineOverallRanks2!: number

  // @field(FieldType.bytes, 192, 18)
  // unknown15C!: number

  // @field(FieldType.int, 210, 2)
  // u1!: number

  // @field(FieldType.int, 212, 2)
  // u2!: number

  // @field(FieldType.bytes, 214, 46)
  // unknown112!: number

  // @field(FieldType.bytes, 260, 52)
  // fishingRecordsFish0!: number

  // @field(FieldType.bytes, 312, 22)
  // beastExp0!: number

  // @field(FieldType.int, 334, 2)
  // unknown1EA0!: number

  // @field(FieldType.int, 336, 2)
  // unknown1EA1!: number

  // @field(FieldType.int, 338, 2)
  // unknown1EA2!: number

  // @field(FieldType.int, 340, 2)
  // unknown1EA3!: number

  // @field(FieldType.int, 342, 2)
  // unknown1EA4!: number

  // @field(FieldType.int, 344, 2)
  // pvpFrontlineWeeklyRanks0!: number

  // @field(FieldType.int, 346, 2)
  // pvpFrontlineWeeklyRanks1!: number

  // @field(FieldType.int, 348, 2)
  // pvpFrontlineWeeklyRanks2!: number

  // @field(FieldType.int, 350, 2)
  // unknownMask1FA0!: number

  // @field(FieldType.int, 352, 2)
  // unknownMask1FA1!: number

  // @field(FieldType.int, 354, 2)
  // unknownMask1FA2!: number

  // @field(FieldType.int, 356, 2)
  // unknownMask1FA3!: number

  @field(FieldType.string, 538, 21)
  companionName!: string

  @field(FieldType.byte, 559)
  companionDefRank!: number

  @field(FieldType.byte, 560)
  companionAttRank!: number

  @field(FieldType.byte, 561)
  companionHealRank!: number

  // @field(FieldType.bytes, 382, 8)
  // u19!: number

  // @field(FieldType.bytes, 390, 22)
  // mountGuideMask0!: number

  @field(FieldType.string, 584, 32)
  nickname!: string

  // @field(FieldType.bytes, 444, 16)
  // unknownOword!: number

  // @field(FieldType.byte, 460)
  // unknownOw!: number

  // @field(FieldType.bytes, 461, 64)
  // unlockBitmask!: number

  // @field(FieldType.bytes, 525, 21)
  // aetheryte!: number

  // @field(FieldType.bytes, 546, 445)
  // discovery!: number

  // @field(FieldType.bytes, 991, 34)
  // howto!: number

  // @field(FieldType.bytes, 1025, 45)
  // minions!: number

  // @field(FieldType.bytes, 1070, 10)
  // chocoboTaxiMask!: number

  // @field(FieldType.bytes, 1080, 124)
  // watchedCutscenes0!: number

  // @field(FieldType.bytes, 1204, 10)
  // companionBardingMask0!: number

  // @field(FieldType.byte, 1214)
  // companionEquippedHead!: number

  // @field(FieldType.byte, 1215)
  // companionEquippedBody!: number

  // @field(FieldType.byte, 1216)
  // companionEquippedLegs!: number

  // @field(FieldType.byte, 1217)
  // unknown52A0!: number

  // @field(FieldType.byte, 1218)
  // unknown52A1!: number

  // @field(FieldType.byte, 1219)
  // unknown52A2!: number

  // @field(FieldType.byte, 1220)
  // unknown52A3!: number

  // @field(FieldType.bytes, 1221, 11)
  // unknownMask52E0!: number

  // @field(FieldType.bytes, 1232, 105)
  // fishingGuideMask0!: number

  // @field(FieldType.bytes, 1337, 31)
  // fishingSpotVisited0!: number

  // @field(FieldType.bytes, 1368, 34)
  // unknown59A0!: number

  // @field(FieldType.bytes, 1402, 11)
  // beastRank0!: number

  // @field(FieldType.bytes, 1413, 11)
  // unknownPvp5AB0!: number

  // @field(FieldType.byte, 1424)
  // unknown5B90!: number

  // @field(FieldType.byte, 1425)
  // unknown5B91!: number

  // @field(FieldType.byte, 1426)
  // unknown5B92!: number

  // @field(FieldType.byte, 1427)
  // unknown5B93!: number

  // @field(FieldType.byte, 1428)
  // unknown5B94!: number

  // @field(FieldType.byte, 1429)
  // pose!: number

  // @field(FieldType.byte, 1430)
  // unknown5B91!: number

  // @field(FieldType.bytes, 1431, 9)
  // challengeLogComplete0!: number

  // @field(FieldType.byte, 1440)
  // weaponPose!: number

  // @field(FieldType.bytes, 1441, 38)
  // unknownMask6730!: number

  // @field(FieldType.bytes, 1479, 12)
  // relicCompletion0!: number

  // 5.25: 80 + 62 + 62 + 45 = 249
  @field(FieldType.bytes, 1692, 32)
  sightseeingLog!: Buffer

  // @field(FieldType.bytes, 1517, 55)
  // huntingMarkMask0!: number

  // @field(FieldType.bytes, 1572, 32)
  // tripleTriadCards!: number

  // @field(FieldType.bytes, 1604, 12)
  // u120!: number

  // @field(FieldType.bytes, 1616, 22)
  // aetherCurrentMask!: number

  // @field(FieldType.byte, 1638)
  // u100!: number

  // @field(FieldType.byte, 1639)
  // u101!: number

  // @field(FieldType.byte, 1640)
  // u102!: number

  @field(FieldType.bytes, 1890, 48)
  orchestrionList!: Buffer

  // @field(FieldType.byte, 1681)
  // hallOfNoviceCompletion0!: number

  // @field(FieldType.byte, 1682)
  // hallOfNoviceCompletion1!: number

  // @field(FieldType.byte, 1683)
  // hallOfNoviceCompletion2!: number

  // @field(FieldType.bytes, 1684, 11)
  // animaCompletion!: number

  // @field(FieldType.bytes, 1695, 16)
  // u140!: number

  // @field(FieldType.bytes, 1711, 13)
  // u150!: number

  // @field(FieldType.bytes, 1724, 28)
  // unlockedRaids!: number

  // @field(FieldType.bytes, 1752, 18)
  // unlockedDungeons0!: number

  // @field(FieldType.bytes, 1770, 10)
  // unlockedGuildhests0!: number

  // @field(FieldType.bytes, 1780, 8)
  // unlockedTrials0!: number

  // @field(FieldType.byte, 1788)
  // unlockedPvp0!: number

  // @field(FieldType.byte, 1789)
  // unlockedPvp1!: number

  // @field(FieldType.byte, 1790)
  // unlockedPvp2!: number

  // @field(FieldType.byte, 1791)
  // unlockedPvp3!: number

  // @field(FieldType.byte, 1792)
  // unlockedPvp4!: number

  // @field(FieldType.bytes, 1793, 28)
  // clearedRaids0!: number

  // @field(FieldType.bytes, 1821, 18)
  // clearedDungeons0!: number

  // @field(FieldType.int, 1839, 10)
  // clearedGuildhests0!: number

  // @field(FieldType.bytes, 1849, 8)
  // clearedTrials0!: number

  // @field(FieldType.bytes, 1857, 5)
  // clearedPvp0!: number

  // @field(FieldType.bytes, 1862, 52)
  // fishingRecordsFishWeight!: number

  // @field(FieldType.int, 1914, 4)
  // exploratoryMissionNextTimestamp!: number

  // @field(FieldType.byte, 1918)
  // pvpLevel!: number
}
