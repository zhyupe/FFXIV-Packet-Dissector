import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field, format } from '@/struct/struct.decorator'

// PlayerSetup aggregates several client structures; it is not a PlayerState memory dump.
// The section classes below group contiguous wire ranges. Offsets in each section are
// relative to that section; the enclosing PlayerSetup fields give payload offsets.
// Bitsets expose zero-based, LSB-first set-bit indices, not automatically Item IDs.
// Unknown bytes and unassigned packed bits are retained rather than treated as padding.

// Identity, counters and compact state consumed by PlayerState, Buddy, PvPProfile,
// RelicNote and other UI managers.
export class PlayerSetupHeader extends Struct {
  // PlayerState.ContentId; identifiers retain all 64 bits.
  @field(FieldType.biguint, 0x0, 8)
  @format({ base: Base.HEX })
  contentId!: bigint

  // Unidentified UIState initialization value; retain the full wire region.
  @field(FieldType.bytes, 0x8, 8)
  unknown8!: Buffer

  // Unknown region; not assumed to be padding.
  @field(FieldType.bytes, 0x10, 8)
  unknown10!: Buffer

  // PlayerState.EntityId.
  @field(FieldType.uint, 0x18, 4)
  @format({ base: Base.HEX })
  entityId!: number

  // PlayerState.BaseRestedExperience.
  @field(FieldType.uint, 0x1c, 4)
  restedExp!: number

  // Buddy.CompanionInfo.CurrentXP.
  @field(FieldType.uint, 0x20, 4)
  companionCurrentExp!: number

  // Unidentified GCSupply state.
  @field(FieldType.uint, 0x24, 4)
  unknownGcSupply24!: number

  // PlayerState.NumFishCaught: total catches, not the number of set species bits.
  @field(FieldType.uint, 0x28, 4)
  fishCaught!: number

  // PlayerState.FishingBait (Item row ID).
  @field(FieldType.uint, 0x2c, 4)
  @format({ db: 'Item' })
  fishingBait!: number

  // PlayerState.NumSpearfishCaught.
  @field(FieldType.uint, 0x30, 4)
  spearfishCaught!: number

  // Unidentified PvPProfile statistic.
  @field(FieldType.uint, 0x34, 2)
  unknownPvp34!: number

  // Unknown region; not assumed to be padding.
  @field(FieldType.bytes, 0x36, 2)
  unknown36!: Buffer

  @field(FieldType.uint, 0x38, 4)
  frontlineTotalMatches!: number

  // PlayerState.SquadronMissionCompletionTimestamp (signed Unix seconds).
  @field(FieldType.int, 0x3c, 4)
  squadronMissionCompletionTimestamp!: number

  // PlayerState.SquadronTrainingCompletionTimestamp (signed Unix seconds).
  @field(FieldType.int, 0x40, 4)
  squadronTrainingCompletionTimestamp!: number

  @field(FieldType.uint, 0x44, 4)
  unknown44!: number

  // PlayerState.WeeklyBingoTaskStatus: 16 two-bit states, least significant pair first.
  @field(FieldType.uint, 0x48, 4)
  weeklyBingoTaskStatus!: number

  // PlayerState.WeeklyBingoFlags. Expiry = 1211270400 + 604800 * ((value >> 4) & 0xfff).
  // Other packed bits are retained without assigning unconfirmed meanings.
  @field(FieldType.uint, 0x4c, 4)
  weeklyBingoFlags!: number

  // Buddy.CompanionInfo.TimeLeft; floating-point remaining time.
  @field(FieldType.float, 0x50, 4)
  companionTimeLeft!: number

  @field(FieldType.uint, 0x54, 4)
  unknown54!: number

  @field(FieldType.int, 0x58, 4)
  unknownTimestamp58!: number

  // Unknown region; not assumed to be padding.
  @field(FieldType.bytes, 0x5c, 2)
  unknown5C!: Buffer

  // Four unidentified PvPProfile statistics.
  @field(FieldType.array, 0x5e, 8)
  @child({ type: FieldType.uint, byteLength: 2 })
  unknownPvp5E!: number[]

  @field(FieldType.uint, 0x66, 2)
  pvpSeriesExperience!: number

  @field(FieldType.uint, 0x68, 2)
  playerCommendations!: number

  @field(FieldType.uint, 0x6a, 2)
  unknownDailyQuest6A!: number

  @field(FieldType.uint, 0x6c, 2)
  unknown6C!: number

  @field(FieldType.uint, 0x6e, 2)
  frontlineWeeklyMatches!: number

  // AnimaWeapon7Work: bits 0..13 are progress, bit 14 is a quest-item state; bit 15 is unknown.
  @field(FieldType.uint, 0x70, 2)
  animaWeapon7Work!: number

  @field(FieldType.uint, 0x72, 2)
  activeGcArmyExpedition!: number

  @field(FieldType.uint, 0x74, 2)
  activeGcArmyTraining!: number

  @field(FieldType.uint, 0x76, 2)
  unknownGoldSaucer76!: number

  // PlayerState.WeeklyBingoStickers: 16 sticker positions, least significant bit first.
  @field(FieldType.uint, 0x78, 2)
  weeklyBingoStickers!: number

  @field(FieldType.uint, 0x7a, 2)
  rivalWingsTotalMatches!: number

  @field(FieldType.uint, 0x7c, 2)
  rivalWingsTotalMatchesWon!: number

  @field(FieldType.uint, 0x7e, 2)
  rivalWingsWeeklyMatches!: number

  @field(FieldType.uint, 0x80, 2)
  rivalWingsWeeklyMatchesWon!: number

  @field(FieldType.byte, 0x82)
  maxLevel!: number

  @field(FieldType.byte, 0x83)
  expansion!: number

  // PlayerState.HasPremiumSaddlebag: nonzero is true; retain the wire byte.
  @field(FieldType.byte, 0x84)
  hasPremiumSaddlebag!: number

  // Two unidentified PlayerState booleans; retain the original nonzero values.
  @field(FieldType.array, 0x85, 2)
  @child({ type: FieldType.byte, byteLength: 1 })
  unknownBooleans85!: number[]

  @field(FieldType.byte, 0x87)
  race!: number

  @field(FieldType.byte, 0x88)
  tribe!: number

  @field(FieldType.byte, 0x89)
  gender!: number

  // PlayerState.CurrentClassJobId.
  @field(FieldType.byte, 0x8a)
  @format({ db: 'ClassJob' })
  currentJob!: number

  // PlayerState.FirstClass; distinct from the current class/job.
  @field(FieldType.byte, 0x8b)
  firstClass!: number

  @field(FieldType.byte, 0x8c)
  deity!: number

  @field(FieldType.byte, 0x8d)
  namedayMonth!: number

  @field(FieldType.byte, 0x8e)
  namedayDay!: number

  @field(FieldType.byte, 0x8f)
  cityState!: number

  // PlayerState.HomeAetheryteId; a two-byte row ID.
  @field(FieldType.uint, 0x90, 2)
  @format({ db: 'Aetheryte' })
  homepoint!: number

  @field(FieldType.byte, 0x92)
  questSpecialFlags!: number

  // Unidentified Buddy.PetInfo.Pet state.
  @field(FieldType.byte, 0x93)
  unknownPet93!: number

  @field(FieldType.byte, 0x94)
  companionRank!: number

  @field(FieldType.byte, 0x95)
  companionStars!: number

  @field(FieldType.byte, 0x96)
  companionSp!: number

  // Buddy.CompanionInfo.ActiveCommand.
  @field(FieldType.byte, 0x97)
  companionActiveCommand!: number

  // Buddy.CompanionInfo.CurrentColorStainId.
  @field(FieldType.byte, 0x98)
  @format({ db: 'Stain' })
  companionColor!: number

  @field(FieldType.byte, 0x99)
  companionFavoFeed!: number

  @field(FieldType.byte, 0x9a)
  favouriteAetheryteCount!: number

  @field(FieldType.byte, 0x9b)
  dailyQuestSeed!: number

  // PlayerState reward-received bits; GetReceivedRewardCount selects a bit by index.
  @field(FieldType.byte, 0x9c)
  receivedContentRewards!: number

  @field(FieldType.byte, 0x9d)
  weeklyLockoutInfo!: number

  // RelicNote.RelicId; this is an identifier, not a has-book boolean.
  @field(FieldType.byte, 0x9e)
  relicId!: number

  // RelicNote.RelicNoteId.
  @field(FieldType.byte, 0x9f)
  relicNoteId!: number

  @field(FieldType.byte, 0xa0)
  sightseeingLogUnlockState!: number

  @field(FieldType.byte, 0xa1)
  sightseeingLogUnlockStateEx!: number

  @field(FieldType.byte, 0xa2)
  unknownBooleanA2!: number

  @field(FieldType.byte, 0xa3)
  unknownA3!: number

  // PlayerState.MeisterFlag: crafting specialist bits.
  @field(FieldType.byte, 0xa4)
  meisterFlag!: number

  // Gold Saucer additional unlock flags; bit 0 unlocks the Triple Triad Battlehall.
  @field(FieldType.byte, 0xa5)
  goldSaucerAdditionalFlags!: number

  // First byte of PlayerState aether-current zone completion (zone index minus one).
  // The remaining three bytes are in content.aetherCurrentZoneCompletionRemaining.
  @field(FieldType.bitset, 0xa6, 1)
  aetherCurrentZoneCompletionFirst!: number[]

  @field(FieldType.byte, 0xa7)
  beginnerGuideFlags!: number

  @field(FieldType.byte, 0xa8)
  hasNewGcArmyCandidate!: number

  @field(FieldType.byte, 0xa9)
  completedLoVMStages!: number

  @field(FieldType.byte, 0xaa)
  unknownAA!: number

  @field(FieldType.byte, 0xab)
  satisfactionSupplySeed!: number

  @field(FieldType.byte, 0xac)
  goldSaucerContentStatus!: number

  @field(FieldType.byte, 0xad)
  mentorVersion!: number

  // Unidentified HWDManager state; retain all bits.
  @field(FieldType.byte, 0xae)
  unknownHwdAE!: number

  @field(FieldType.byte, 0xaf)
  weeklyBingoExpMultiplier!: number

  @field(FieldType.byte, 0xb0)
  weeklyBingoUnknownFlag!: number

  @field(FieldType.byte, 0xb1)
  pvpSeriesCurrentRank!: number

  @field(FieldType.byte, 0xb2)
  pvpSeriesClaimedRank!: number

  @field(FieldType.byte, 0xb3)
  pvpPreviousSeriesClaimedRank!: number

  @field(FieldType.byte, 0xb4)
  pvpPreviousSeriesRank!: number

  @field(FieldType.byte, 0xb5)
  unknownB5!: number

  // Unknown region; not assumed to be padding.
  @field(FieldType.bytes, 0xb6, 1)
  unknownB6!: Buffer

  @field(FieldType.uint, 0xb7, 2)
  unknownB7!: number

  @field(FieldType.byte, 0xb9)
  unknownB9!: number

  // Unknown region; not assumed to be padding.
  @field(FieldType.bytes, 0xba, 2)
  unknownBA!: Buffer
}

// Parallel progress arrays for PlayerState, PvPProfile, FishRecord, QuestManager
// and SatisfactionSupplyManager, followed by Buddy companion state.
export class PlayerSetupProgress extends Struct {
  // PlayerState.ClassJobExperience, indexed by ClassJob.ExpArrayIndex.
  @field(FieldType.array, 0x0, 140)
  @child({ type: FieldType.uint, byteLength: 4 })
  exp!: number[]

  // PvPProfile experience in Maelstrom, Twin Adder, Immortal Flames order.
  @field(FieldType.array, 0x8c, 12)
  @child({ type: FieldType.uint, byteLength: 4 })
  pvpGrandCompanyExp!: number[]

  // PvPProfile lifetime first-, second- and third-place counts.
  @field(FieldType.array, 0x98, 12)
  @child({ type: FieldType.uint, byteLength: 4 })
  frontlineTotalPlacements!: number[]

  // PlayerState.UnknownUnixTimestamp; signed seconds, purpose unknown.
  @field(FieldType.int, 0xa4, 4)
  unknownTimestamp160!: number

  // PlayerState.ClassJobLevels; same ExpArrayIndex slots as exp.
  @field(FieldType.array, 0xa8, 70)
  @child({ type: FieldType.uint, byteLength: 2 })
  level!: number[]

  // Parallel active festival ID and phase arrays; zero slots are retained.
  @field(FieldType.array, 0xee, 16)
  @child({ type: FieldType.uint, byteLength: 2 })
  festivalIds!: number[]

  @field(FieldType.array, 0xfe, 16)
  @child({ type: FieldType.uint, byteLength: 2 })
  festivalPhases!: number[]

  // FishRecord species IDs by FishingRecordType slot. Below 20000: FishParameter;
  // 20000 and above: SpearfishingItem. These are not Item row IDs.
  @field(FieldType.array, 0x10e, 88)
  @child({ type: FieldType.uint, byteLength: 2 })
  fishRecordIds!: number[]

  // FishRecord sizes in the same 44 slots as fishRecordIds; wire units are tenths.
  @field(FieldType.array, 0x166, 88)
  @child({ type: FieldType.uint, byteLength: 2 })
  @format({ divisor: 10 })
  fishRecordSizes!: number[]

  // QuestManager beast-tribe reputation values, indexed by tribe ID minus one.
  @field(FieldType.array, 0x1be, 40)
  @child({ type: FieldType.uint, byteLength: 2 })
  beastTribeReputation!: number[]

  // Five unidentified QuestManager values.
  @field(FieldType.array, 0x1e6, 10)
  @child({ type: FieldType.uint, byteLength: 2 })
  unknownQuestManager2A2!: number[]

  // PvPProfile weekly first-, second- and third-place counts.
  @field(FieldType.array, 0x1f0, 6)
  @child({ type: FieldType.uint, byteLength: 2 })
  frontlineWeeklyPlacements!: number[]

  // SatisfactionSupplyManager satisfaction within the current rank, by NPC slot.
  @field(FieldType.array, 0x1f6, 24)
  @child({ type: FieldType.uint, byteLength: 2 })
  satisfactionValues!: number[]

  // Buddy.CompanionInfo name, bounded to its 21-byte wire slot.
  @field(FieldType.string, 0x20e, 21)
  companionName!: string

  // Buddy.CompanionInfo defender, attacker and healer ranks, in that order.
  @field(FieldType.array, 0x223, 3)
  @child({ type: FieldType.byte, byteLength: 1 })
  companionSkillRanks!: number[]
}

// Collection and map discovery flags, identity text slots and Buddy/GCSupply state.
export class PlayerSetupUnlocks extends Struct {
  // PlayerState mount unlocks, indexed by Mount.Order.
  @field(FieldType.bitset, 0x0, 45)
  unlockedMountIndices!: number[]

  // PlayerState fashion accessory unlocks, indexed by the Ornament sheet.
  @field(FieldType.bitset, 0x2d, 8)
  unlockedOrnamentIndices!: number[]

  // PlayerState glasses-style unlock indices (0..71).
  @field(FieldType.bitset, 0x35, 9)
  unlockedGlassesStyleIndices!: number[]

  // PlayerState portrait framing kit unlock indices.
  @field(FieldType.bitset, 0x3e, 44)
  unlockedFramersKitIndices!: number[]

  // PlayerState name; the wire slot ends before the OnlineId region.
  @field(FieldType.string, 0x6a, 32)
  nickname!: string

  // PlayerState OnlineId-related region; encoding and effective string length unknown.
  @field(FieldType.bytes, 0x8a, 32)
  unknownOnlineId!: Buffer

  // UIState unlock-link indices.
  @field(FieldType.bitset, 0xaa, 92)
  unlockLinks!: number[]

  // UIState unlocked Aetheryte row IDs.
  @field(FieldType.bitset, 0x106, 30)
  unlockedAetherytes!: number[]

  @field(FieldType.array, 0x124, 8)
  @child({ type: FieldType.uint, byteLength: 2 })
  @format({ db: 'Aetheryte' })
  favouriteAetherytes!: number[]

  @field(FieldType.array, 0x12c, 6)
  @child({ type: FieldType.uint, byteLength: 2 })
  @format({ db: 'Aetheryte' })
  freeAetherytes!: number[]

  // MapDiscoveryManager first discovery block: 2592 LSB-first flags.
  @field(FieldType.bitset, 0x132, 324)
  mapDiscoveryFirst!: number[]

  // MapDiscoveryManager second block: 1568 flags. Indices here are local to this
  // block; add 2592 to address the combined discovery bit sequence.
  @field(FieldType.bitset, 0x276, 196)
  mapDiscoverySecond!: number[]

  @field(FieldType.bitset, 0x33a, 38)
  unlockedHowTos!: number[]

  // UIState Companion (minion) unlocks; distinct from the companion chocobo.
  @field(FieldType.bitset, 0x360, 75)
  unlockedCompanions!: number[]

  @field(FieldType.bitset, 0x3ab, 12)
  unlockedChocoboTaxiStands!: number[]

  @field(FieldType.bitset, 0x3b7, 184)
  seenCutscenes!: number[]

  // Buddy.CompanionInfo BuddyEquip unlock indices.
  @field(FieldType.bitset, 0x46f, 14)
  unlockedBuddyEquip!: number[]

  // Buddy.CompanionInfo equipped head, body and feet barding IDs.
  @field(FieldType.array, 0x47d, 3)
  @child({ type: FieldType.byte, byteLength: 1 })
  companionEquipment!: number[]

  // Unidentified GCSupply state; retain raw bytes.
  @field(FieldType.bytes, 0x480, 4)
  unknownGcSupply762!: Buffer

  // Unidentified GCSupply packed state: big-endian groups of 4, 4 and 3 bytes.
  // Retain the original bytes rather than applying little-endian integer decoding.
  @field(FieldType.bytes, 0x484, 11)
  unknownGcSupply766!: Buffer
}

// Fishing notebook, PvP/quest progress, ContentsNote and RelicNote state.
export class PlayerSetupCompletion extends Struct {
  // PlayerState caught-fish bitmap, indexed by FishParameter row ID.
  @field(FieldType.bitset, 0x0, 191)
  caughtFish!: number[]

  // PlayerState discovered fishing spots, indexed by FishingSpot.Order.
  @field(FieldType.bitset, 0xbf, 43)
  discoveredFishingSpotIndices!: number[]

  // PlayerState caught-spearfish bitmap; add 20000 to an index for SpearfishingItem row ID.
  @field(FieldType.bitset, 0xea, 38)
  caughtSpearfishIndices!: number[]

  // PlayerState discovered spearfishing spots; indices remain in their own bit space.
  @field(FieldType.bitset, 0x110, 9)
  discoveredSpearfishingSpotIndices!: number[]

  // PvPProfile ranks in Maelstrom, Twin Adder, Immortal Flames order.
  @field(FieldType.array, 0x119, 3)
  @child({ type: FieldType.byte, byteLength: 1 })
  pvpGrandCompanyRanks!: number[]

  // QuestManager beast-tribe ranks, indexed by tribe ID minus one.
  // Bits 0..6 are rank; bit 7 indicates a rank increase today.
  @field(FieldType.array, 0x11c, 20)
  @child({ type: FieldType.byte, byteLength: 1 })
  beastTribeRankFlags!: number[]

  // PlayerState.ContentRouletteCompletion: 12 byte values, not a bitmap.
  @field(FieldType.array, 0x130, 12)
  @child({ type: FieldType.byte, byteLength: 1 })
  rouletteCompletion!: number[]

  // PlayerState.SelectedPoses; retain raw values before client validity checks.
  @field(FieldType.array, 0x13c, 8)
  @child({ type: FieldType.byte, byteLength: 1 })
  selectedPoses!: number[]

  // PlayerState flags; raw set-bit indices, without interpreting inverted flags.
  @field(FieldType.bitset, 0x144, 3)
  playerStateFlags!: number[]

  // ContentsNote completed challenge-log indices.
  @field(FieldType.bitset, 0x147, 13)
  completedChallengeLog!: number[]

  // PlayerState SecretRecipeBook unlock indices. The following bytes are a separate region.
  @field(FieldType.bitset, 0x154, 14)
  unlockedSecretRecipeBooks!: number[]

  // Unidentified PlayerState region; not part of the secret-recipe bitmap.
  @field(FieldType.bytes, 0x162, 28)
  unknown8D3!: Buffer

  // RelicNote.MonsterProgress: ten independent monster kill counts.
  @field(FieldType.array, 0x17e, 10)
  @child({ type: FieldType.byte, byteLength: 1 })
  relicMonsterProgress!: number[]

  // RelicNote.ObjectiveProgress: two wire bytes of objective flags.
  @field(FieldType.uint, 0x188, 2)
  relicObjectiveProgress!: number

  // PlayerState sightseeing-log completion bits.
  @field(FieldType.bitset, 0x18a, 43)
  sightseeingLog!: number[]
}

// PlayerState/UIState content flags, Anima work, WeeklyBingo and SatisfactionSupply state.
export class PlayerSetupContent extends Struct {
  // UIState TripleTriadCard unlock indices.
  @field(FieldType.bitset, 0x0, 60)
  unlockedTripleTriadCards!: number[]

  // PlayerState defeated Triple Triad NPC indices.
  @field(FieldType.bitset, 0x3c, 17)
  beatenTripleTriadNpcs!: number[]

  // Bytes 1..3 of the aether-current zone bitmap; add 8 to these local bit indices.
  // Byte 0 is header.aetherCurrentZoneCompletionFirst.
  @field(FieldType.bitset, 0x4d, 3)
  aetherCurrentZoneCompletionRemaining!: number[]

  @field(FieldType.bitset, 0x50, 56)
  unlockedAetherCurrents!: number[]

  @field(FieldType.bitset, 0x88, 2)
  minerFolklore!: number[]

  @field(FieldType.bitset, 0x8a, 2)
  botanistFolklore!: number[]

  @field(FieldType.bitset, 0x8c, 2)
  fishingFolklore!: number[]

  // PlayerState Orchestrion unlock indices.
  @field(FieldType.bitset, 0x8e, 112)
  orchestrionList!: number[]

  @field(FieldType.bitset, 0xfe, 4)
  completedBeginnerTraining!: number[]

  // AnimaWeapon5Work: the low seven bits of each of the first ten bytes are progress.
  // High bits and the final byte include additional state; retain them unmodified.
  @field(FieldType.bytes, 0x102, 11)
  animaWeapon5Work!: Buffer

  // PlayerState.WeeklyBingoOrderData: 16 task IDs, retaining empty slots.
  @field(FieldType.array, 0x10d, 16)
  @child({ type: FieldType.byte, byteLength: 1 })
  weeklyBingoOrderData!: number[]

  // PlayerState.WeeklyBingoRewardData: four reward IDs.
  @field(FieldType.array, 0x11d, 4)
  @child({ type: FieldType.byte, byteLength: 1 })
  weeklyBingoRewardData!: number[]

  // SatisfactionSupplyManager ranks by NPC slot; retain zero (the client promotes it to one).
  @field(FieldType.array, 0x121, 12)
  @child({ type: FieldType.byte, byteLength: 1 })
  satisfactionRanks!: number[]

  // SatisfactionSupplyManager used allowances by NPC slot, not remaining allowances.
  @field(FieldType.array, 0x12d, 12)
  @child({ type: FieldType.byte, byteLength: 1 })
  satisfactionUsedAllowances!: number[]

  // PlayerState content unlock and completion bitmaps below each have their own
  // index space; they are not a single list of ContentFinderCondition row IDs.
  @field(FieldType.bitset, 0x139, 1)
  unlockedSpecialContent!: number[]

  @field(FieldType.bitset, 0x13a, 28)
  unlockedRaids!: number[]

  @field(FieldType.bitset, 0x156, 18)
  unlockedDungeons!: number[]

  @field(FieldType.bitset, 0x168, 10)
  unlockedGuildOrders!: number[]

  @field(FieldType.bitset, 0x172, 14)
  unlockedTrials!: number[]

  @field(FieldType.bitset, 0x180, 3)
  unlockedCrystallineConflicts!: number[]

  @field(FieldType.bitset, 0x183, 2)
  unlockedFrontlines!: number[]

  @field(FieldType.bitset, 0x185, 28)
  completedRaids!: number[]

  @field(FieldType.bitset, 0x1a1, 18)
  completedDungeons!: number[]

  @field(FieldType.bitset, 0x1b3, 10)
  completedGuildOrders!: number[]

  @field(FieldType.bitset, 0x1bd, 14)
  completedTrials!: number[]

  @field(FieldType.bitset, 0x1cb, 3)
  completedCrystallineConflicts!: number[]

  @field(FieldType.bitset, 0x1ce, 2)
  completedFrontlines!: number[]

  @field(FieldType.bitset, 0x1d0, 4)
  completedMaskedCarnivale!: number[]

  @field(FieldType.bitset, 0x1d4, 7)
  completedVVDNotebookContents!: number[]

  @field(FieldType.bitset, 0x1db, 5)
  unlockedMiscContent!: number[]

  @field(FieldType.bitset, 0x1e0, 5)
  completedMiscContent!: number[]
}

// MobHunt ordinary bill: held ID/flag, available ID, then five target kill counts.
export class PlayerSetupHuntDaily extends Struct {
  // Bits 0..6: obtained bill ID; bit 7: bill held.
  @field(FieldType.byte, 0)
  obtainedIdAndFlags!: number

  @field(FieldType.byte, 1)
  availableId!: number

  @field(FieldType.array, 2, 5)
  @child({ type: FieldType.byte, byteLength: 1 })
  killCounts!: number[]
}

export class PlayerSetupHuntElite extends Struct {
  // Bits 0..4: obtained bill ID; bit 5: bill held; bits 6..7: unknown.
  @field(FieldType.byte, 0)
  obtainedIdAndFlags!: number

  // Bits 0..1: kill count; bits 2..6: available bill ID; bit 7: unknown.
  @field(FieldType.byte, 1)
  availableIdAndKillCount!: number
}

export class PlayerSetupHuntGroup extends Struct {
  @field(FieldType.array, 0, 3 * 7)
  @child(PlayerSetupHuntDaily)
  daily!: PlayerSetupHuntDaily[]

  @field(FieldType.object, 21, 2)
  @child(PlayerSetupHuntElite)
  elite!: PlayerSetupHuntElite
}

// MobHunt packs 22 bill slots into an initial 9-byte record and five 23-byte groups.
// ObtainedFlags is reconstructed by the client from the scattered held bits.
export class PlayerSetupHunts extends Struct {
  // Daily slot 0 and elite slot 4 are interleaved here, unlike the later groups.
  @field(FieldType.byte, 0)
  dailyAvailableId!: number

  // Bits 0..6: obtained bill ID; bit 7: bill held.
  @field(FieldType.byte, 1)
  dailyObtainedIdAndFlags!: number

  // Same masks as PlayerSetupHuntElite.obtainedIdAndFlags.
  @field(FieldType.byte, 2)
  eliteObtainedIdAndFlags!: number

  @field(FieldType.array, 3, 5)
  @child({ type: FieldType.byte, byteLength: 1 })
  dailyKillCounts!: number[]

  // Same masks as PlayerSetupHuntElite.availableIdAndKillCount.
  @field(FieldType.byte, 8)
  eliteAvailableIdAndKillCount!: number

  // Daily/elite slots: (1,2,3;5), (6,7,8;9), (10,11,12;13),
  // (14,15,16;17), (18,19,20;21). Unknown flag bits are preserved.
  @field(FieldType.array, 9, 5 * 23)
  @child(PlayerSetupHuntGroup)
  groups!: PlayerSetupHuntGroup[]
}

export class PlayerSetup extends Struct {
  @field(FieldType.object, 0x0, 188)
  @child(PlayerSetupHeader)
  header!: PlayerSetupHeader

  @field(FieldType.object, 0xbc, 550)
  @child(PlayerSetupProgress)
  progress!: PlayerSetupProgress

  @field(FieldType.object, 0x2e2, 1167)
  @child(PlayerSetupUnlocks)
  unlocks!: PlayerSetupUnlocks

  @field(FieldType.object, 0x771, 437)
  @child(PlayerSetupCompletion)
  completion!: PlayerSetupCompletion

  @field(FieldType.object, 0x926, 124)
  @child(PlayerSetupHunts)
  hunts!: PlayerSetupHunts

  @field(FieldType.object, 0x9a2, 485)
  @child(PlayerSetupContent)
  content!: PlayerSetupContent

  // Preserve any remaining wire bytes; no unverified alignment padding is required.
  @field(FieldType.bytes, 0xb87)
  unknownTail!: Buffer
}
