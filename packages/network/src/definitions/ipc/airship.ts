import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field, format } from '@/struct/struct.decorator'

class AirshipExplorationResultEntry extends Struct {
  static byteLength = 56

  @field(FieldType.uint, 0, 4)
  exp!: number

  @field(FieldType.uint, 4, 4)
  favorResult!: number

  @field(FieldType.byte, 8)
  sectorId!: number

  @field(FieldType.byte, 9)
  discoveredSectorId!: number

  @field(FieldType.byte, 10)
  expRating!: number

  @field(FieldType.byte, 11)
  unknown0!: number

  @field(FieldType.uint, 12, 4)
  @format({ db: 'Item' })
  loot1ItemId!: number

  @field(FieldType.uint, 16, 4)
  @format({ db: 'Item' })
  loot2ItemId!: number

  @field(FieldType.uint, 20, 2)
  loot1Quantity!: number

  @field(FieldType.uint, 22, 2)
  loot2Quantity!: number

  @field(FieldType.uint, 24, 4)
  loot1SurveillanceResult!: number

  @field(FieldType.uint, 28, 4)
  loot2SurveillanceResult!: number

  @field(FieldType.uint, 32, 4)
  loot1RetrievalResult!: number

  @field(FieldType.uint, 36, 4)
  loot2RetrievalResult!: number

  @field(FieldType.uint, 40, 4)
  loot1ItemDiscoveryDescription!: number

  @field(FieldType.uint, 44, 4)
  loot2ItemDiscoveryDescription!: number

  @field(FieldType.uint, 48, 2)
  unknown1!: number

  @field(FieldType.byte, 50)
  unknown2!: number

  @field(FieldType.byte, 51)
  doubleDip!: number

  @field(FieldType.byte, 52)
  loot1IsHq!: number

  @field(FieldType.byte, 53)
  loot2IsHq!: number

  @field(FieldType.uint, 54, 2)
  unknown3!: number
}

export class AirshipExplorationResult extends Struct {
  @field(FieldType.uint, 0, 2)
  rating!: number

  @field(FieldType.uint, 2, 2)
  airshipSpeed!: number

  @field(FieldType.array, 4, 5 * AirshipExplorationResultEntry.byteLength)
  @child(AirshipExplorationResultEntry)
  explorationResult!: AirshipExplorationResultEntry[]
}

class AirshipStatusListItem extends Struct {
  static byteLength = 36

  @field(FieldType.uint, 0, 4)
  birthdate!: number

  @field(FieldType.uint, 4, 4)
  returnTime!: number

  @field(FieldType.uint, 8, 2)
  status!: number

  @field(FieldType.uint, 10, 2)
  rank!: number

  @field(FieldType.string, 12, 20)
  @format({ append: 'val' })
  name!: string

  @field(FieldType.uint, 32, 4)
  padding!: number
}

export class AirshipStatusList extends Struct {
  @field(FieldType.byte, 0)
  unlockedAirshipCount!: number

  @field(FieldType.byte, 1)
  unknown0!: number

  @field(FieldType.byte, 2)
  unknown1!: number

  @field(FieldType.byte, 3)
  unknown2!: number

  @field(FieldType.array, 4, 4 * AirshipStatusListItem.byteLength)
  @child(AirshipStatusListItem)
  statusList!: AirshipStatusListItem[]

  @field(FieldType.bytes, 148, 4)
  unlockedSectors!: Buffer

  @field(FieldType.bytes, 152, 4)
  exploredSectors!: Buffer

  @field(FieldType.uint, 156, 2)
  unknown3!: number
}

export class AirshipStatus extends Struct {
  @field(FieldType.uint, 0, 4)
  returnTime!: number

  @field(FieldType.uint, 4, 2)
  status!: number

  @field(FieldType.uint, 6, 2)
  rank!: number

  @field(FieldType.uint, 8, 2)
  capacity!: number

  @field(FieldType.uint, 10, 2)
  unknown0!: number

  @field(FieldType.uint, 12, 4)
  currentExp!: number

  @field(FieldType.uint, 16, 4)
  totalExpForNextRank!: number

  @field(FieldType.uint, 20, 2)
  unlockedAirshipCount!: number

  @field(FieldType.uint, 22, 2)
  hull!: number

  @field(FieldType.uint, 24, 2)
  rigging!: number

  @field(FieldType.uint, 26, 2)
  forecastle!: number

  @field(FieldType.uint, 28, 2)
  aftcastle!: number

  @field(FieldType.byte, 30)
  dest1!: number

  @field(FieldType.byte, 31)
  dest2!: number

  @field(FieldType.byte, 32)
  dest3!: number

  @field(FieldType.byte, 33)
  dest4!: number

  @field(FieldType.byte, 34)
  dest5!: number

  @field(FieldType.string, 35, 20)
  @format({ append: 'val' })
  name!: string

  @field(FieldType.byte, 55)
  padding1!: number

  @field(FieldType.uint, 56, 2)
  padding2!: number

  @field(FieldType.bytes, 58, 4)
  unlockedSectors!: Buffer

  @field(FieldType.bytes, 62, 4)
  exploredSectors!: Buffer

  @field(FieldType.uint, 66, 2)
  unknown1!: number

  @field(FieldType.uint, 68, 4)
  unknown2!: number
}
