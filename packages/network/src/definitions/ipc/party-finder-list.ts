import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import {
  child,
  condition,
  field,
  format,
  ipcEnum,
  ipcIf,
} from '@/struct/struct.decorator'

@ipcIf('listingId')
@ipcEnum('PartyFinderCategory', {
  None: 0,
  Roulette: 2,
  Dungeons: 4,
  Guildhests: 8,
  Trials: 16,
  Raids: 32,
  HighEndDuty: 64,
  PvP: 128,
  GoldSaucer: 256,
  FATEs: 512,
  TreasureHunts: 1024,
  TheHunt: 2048,
  GatheringForays: 4096,
  DeepDungeons: 8192,
  FieldOperations: 16384,
  VCDungeonFinder: 32768,
})
@ipcEnum('PartyFinderDutyType', { Other: 0, Roulette: 1, Normal: 2 })
export class PartyFinderListing extends Struct {
  static byteLength = 0x190

  @field(FieldType.biguint, 0x00)
  @format({ base: Base.HEX })
  listingId!: bigint

  @field(FieldType.biguint, 0x08)
  @format({ base: Base.HEX })
  accountId!: bigint

  @field(FieldType.biguint, 0x10)
  @format({ base: Base.HEX })
  contentId!: bigint

  @field(FieldType.bytes, 0x18, 4)
  unknown18!: Buffer

  @field(FieldType.uint, 0x1c, 4)
  @format({ enum: 'PartyFinderCategory' })
  category!: number

  @field(FieldType.uint, 0x22, 2)
  @format({ enum: 'PartyFinderDutyType' })
  dutyType!: number

  @field(FieldType.uint, 0x20, 2)
  @condition({
    // These categories use LFGExtensionContent instead of the duty-type table.
    category: [
      { value: 256, label: 'extensionDuty', append: 'val' },
      { value: 8192, label: 'extensionDuty', append: 'val' },
    ],
    dutyType: [
      { value: 1, db: 'ContentRoulette', append: 'enum' },
      { value: 2, db: 'ContentFinderCondition', append: 'enum' },
    ],
  })
  duty!: number

  @field(FieldType.bytes, 0x24, 10)
  unknown24!: Buffer

  @field(FieldType.uint, 0x2e, 2)
  @format({ db: 'World' })
  worldId!: number

  @field(FieldType.bytes, 0x30, 8)
  unknown30!: Buffer

  @field(FieldType.byte, 0x38)
  @format({ base: Base.HEX })
  objectiveFlags!: number

  @field(FieldType.byte, 0x39)
  beginnersWelcome!: number

  @field(FieldType.byte, 0x3a)
  @format({ base: Base.HEX })
  completionStatusFlags!: number

  @field(FieldType.byte, 0x3b)
  @format({ base: Base.HEX })
  dutyFinderSettings!: number

  @field(FieldType.byte, 0x3c)
  lootRule!: number

  @field(FieldType.bytes, 0x3d, 3)
  unknown3D!: Buffer

  @field(FieldType.int, 0x40, 4)
  unknownTimestamp!: number

  @field(FieldType.uint, 0x44, 2)
  secondsRemaining!: number

  @field(FieldType.bytes, 0x46, 6)
  unknown46!: Buffer

  @field(FieldType.uint, 0x4c, 2)
  minimumItemLevel!: number

  @field(FieldType.uint, 0x4e, 2)
  @format({ db: 'World' })
  homeWorldId!: number

  @field(FieldType.uint, 0x50, 2)
  @format({ db: 'World' })
  currentWorldId!: number

  @field(FieldType.byte, 0x52)
  clientLanguage!: number

  @field(FieldType.byte, 0x53)
  totalSlots!: number

  @field(FieldType.byte, 0x54)
  slotsFilled!: number

  @field(FieldType.byte, 0x55)
  unknown55!: number

  @field(FieldType.byte, 0x56)
  @format({ base: Base.HEX })
  joinConditionFlags!: number

  @field(FieldType.byte, 0x57)
  isAlliance!: number

  @field(FieldType.byte, 0x58)
  numberOfParties!: number

  @field(FieldType.bytes, 0x59, 7)
  unknown59!: Buffer

  @field(FieldType.array, 0x60, 8 * 8)
  @child({ type: FieldType.biguint, byteLength: 8 })
  @format({ base: Base.HEX })
  slotFlags!: bigint[]

  @field(FieldType.array, 0xa0, 8)
  @child({ type: FieldType.byte, byteLength: 1 })
  @format({ db: 'ClassJob' })
  jobsPresent!: number[]

  @field(FieldType.string, 0xa8, 32)
  name!: string

  @field(FieldType.string, 0xc8, 192)
  description!: string

  @field(FieldType.bytes, 0x188, 8)
  unknown188!: Buffer
}

export class PartyFinderList extends Struct {
  @field(FieldType.uint, 0, 4)
  unknown0!: number

  @field(FieldType.bytes, 4, 8)
  unknown4!: Buffer

  // Segments start at 1; zero marks the final segment. Empty listings have ID 0.
  @field(FieldType.uint, 12, 2)
  segmentIndex!: number

  @field(FieldType.uint, 14, 2)
  unknownE!: number

  @field(FieldType.array, 16, 4 * PartyFinderListing.byteLength)
  @child(PartyFinderListing)
  entries!: PartyFinderListing[]
}
