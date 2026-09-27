import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field, format } from '@/struct/struct.decorator'

export class CharaCardData extends Struct {
  static byteLength = 0xbc

  @field(FieldType.byte, 0x0)
  version!: number

  @field(FieldType.byte, 0x1)
  expression!: number

  @field(FieldType.byte, 0x2)
  cameraZoom!: number

  @field(FieldType.byte, 0x3)
  directionalLightingRed!: number

  @field(FieldType.byte, 0x4)
  directionalLightingGreen!: number

  @field(FieldType.byte, 0x5)
  directionalLightingBlue!: number

  @field(FieldType.byte, 0x6)
  directionalLightingBrightness!: number

  @field(FieldType.byte, 0x7)
  ambientLightingRed!: number

  @field(FieldType.byte, 0x8)
  ambientLightingGreen!: number

  @field(FieldType.byte, 0x9)
  ambientLightingBlue!: number

  @field(FieldType.byte, 0xa)
  ambientLightingBrightness!: number

  @field(FieldType.byte, 0xb)
  @format({ db: 'ClassJob' })
  portraitClassJob!: number

  @field(FieldType.bytes, 0xc, 26)
  customize!: Buffer

  @field(FieldType.array, 0x26, 12)
  @child({ type: FieldType.byte, byteLength: 1 })
  itemStain0Ids!: number[]

  @field(FieldType.byte, 0x32)
  @format({ base: Base.HEX })
  gearVisibilityFlags!: number

  @field(FieldType.byte, 0x33)
  topBorder!: number

  @field(FieldType.byte, 0x34)
  bottomBorder!: number

  @field(FieldType.byte, 0x35)
  @format({ db: 'ClassJob' })
  preferredClassJob!: number

  // Wire hour indices, before the client rotates them by its local time-zone offset.
  @field(FieldType.bitset, 0x36, 3)
  activeHoursWeekdays!: number[]

  @field(FieldType.bitset, 0x39, 3)
  activeHoursWeekends!: number[]

  @field(FieldType.array, 0x3c, 6)
  @child({ type: FieldType.byte, byteLength: 1 })
  playStyles!: number[]

  // Bit 0: reset after Fantasia; bit 1: visible to no one.
  @field(FieldType.byte, 0x42)
  @format({ base: Base.HEX })
  flags!: number

  // Bit 0 inverts portrait placement.
  @field(FieldType.byte, 0x43)
  @format({ base: Base.HEX })
  layoutFlags!: number

  // Bit 0 restricts visibility to friends.
  @field(FieldType.byte, 0x44)
  @format({ base: Base.HEX })
  privacyFlags!: number

  @field(FieldType.array, 0x45, 12)
  @child({ type: FieldType.byte, byteLength: 1 })
  itemStain1Ids!: number[]

  @field(FieldType.byte, 0x51)
  unknown51!: number

  @field(FieldType.uint, 0x52, 2)
  bannerTimeline!: number

  @field(FieldType.uint, 0x54, 2)
  @format({ divisor: 10 })
  animationProgress!: number

  // Encoded portrait coordinates and directions are retained as wire uint16 values.
  @field(FieldType.array, 0x56, 4)
  @child({ type: FieldType.uint, byteLength: 2 })
  headDirectionRaw!: number[]

  @field(FieldType.array, 0x5a, 4)
  @child({ type: FieldType.uint, byteLength: 2 })
  eyeDirectionRaw!: number[]

  @field(FieldType.array, 0x5e, 6)
  @child({ type: FieldType.uint, byteLength: 2 })
  cameraPositionRaw!: number[]

  @field(FieldType.array, 0x64, 6)
  @child({ type: FieldType.uint, byteLength: 2 })
  cameraTargetRaw!: number[]

  @field(FieldType.uint, 0x6a, 2)
  imageRotationRaw!: number

  @field(FieldType.uint, 0x6c, 2)
  directionalLightingVerticalAngleRaw!: number

  @field(FieldType.uint, 0x6e, 2)
  directionalLightingHorizontalAngleRaw!: number

  @field(FieldType.uint, 0x70, 2)
  bannerDecoration!: number

  @field(FieldType.uint, 0x72, 2)
  bannerBackground!: number

  @field(FieldType.uint, 0x74, 2)
  bannerFrame!: number

  @field(FieldType.uint, 0x76, 2)
  titleId!: number

  @field(FieldType.uint, 0x78, 2)
  basePlate!: number

  @field(FieldType.array, 0x7a, 10)
  @child({ type: FieldType.uint, byteLength: 2 })
  decorations!: number[]

  @field(FieldType.array, 0x84, 4)
  @child({ type: FieldType.uint, byteLength: 2 })
  glassesIds!: number[]

  @field(FieldType.uint, 0x88, 4)
  unknownTimestamp!: number

  @field(FieldType.array, 0x8c, 48)
  @child({ type: FieldType.uint, byteLength: 4 })
  @format({ db: 'Item' })
  itemIds!: number[]
}

export class CharaCard extends Struct {
  static byteLength = 0x1e0

  @field(FieldType.biguint, 0x0)
  @format({ base: Base.HEX })
  freeCompanyCrest!: bigint

  @field(FieldType.biguint, 0x8)
  @format({ base: Base.HEX })
  accountId!: bigint

  @field(FieldType.biguint, 0x10)
  @format({ base: Base.HEX })
  contentId!: bigint

  @field(FieldType.uint, 0x18, 4)
  @format({ base: Base.HEX })
  entityId!: number

  @field(FieldType.uint, 0x1c, 4)
  state!: number

  @field(FieldType.uint, 0x20, 2)
  @format({ db: 'World' })
  worldId!: number

  @field(FieldType.uint, 0x22, 2)
  level!: number

  @field(FieldType.byte, 0x24)
  @format({ db: 'ClassJob' })
  classJob!: number

  @field(FieldType.byte, 0x25)
  sex!: number

  @field(FieldType.byte, 0x26)
  grandCompany!: number

  @field(FieldType.byte, 0x27)
  grandCompanyRank!: number

  @field(FieldType.object, 0x28, 188)
  @child(CharaCardData)
  data!: CharaCardData

  @field(FieldType.int, 0xe4, 4)
  timestamp!: number

  // Preserve SeString payloads separately from the UTF-8 text view.
  @field(FieldType.bytes, 0xe8, 193)
  searchCommentRaw!: Buffer

  @field(FieldType.string, 0xe8, 193)
  searchComment!: string

  @field(FieldType.string, 0x1a9, 32)
  name!: string

  @field(FieldType.string, 0x1c9, 22)
  freeCompany!: string

  @field(FieldType.byte, 0x1df)
  unknown1DF!: number
}
