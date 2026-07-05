import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field, format } from '@/struct/struct.decorator'
import { SubmarineStatusItem } from './common/submarine'

export class SubmarineStatusList extends Struct {
  @field(FieldType.array, 0, 4 * SubmarineStatusItem.byteLength)
  @child(SubmarineStatusItem)
  items!: SubmarineStatusItem[]
}

class SubmarineExplorationResultEntry extends Struct {
  static byteLength = 56

  @field(FieldType.byte, 0)
  sectorId!: number

  @field(FieldType.byte, 1)
  rating!: number

  @field(FieldType.byte, 2)
  unlockedSectorId!: number

  @field(FieldType.byte, 3)
  firstTimeExploration!: number

  @field(FieldType.byte, 4)
  unlockedSubmarineSlot!: number

  @field(FieldType.byte, 5)
  doubleDip!: number

  @field(FieldType.uint, 6, 2)
  unknown0!: number

  @field(FieldType.uint, 8, 4)
  favorResult!: number

  @field(FieldType.uint, 12, 4)
  exp!: number

  @field(FieldType.uint, 16, 4)
  @format({ db: 'Item' })
  loot1ItemId!: number

  @field(FieldType.uint, 20, 4)
  @format({ db: 'Item' })
  loot2ItemId!: number

  @field(FieldType.uint, 24, 2)
  loot1Quantity!: number

  @field(FieldType.uint, 26, 2)
  loot2Quantity!: number

  @field(FieldType.byte, 28)
  loot1IsHq!: number

  @field(FieldType.byte, 29)
  loot2IsHq!: number

  @field(FieldType.byte, 30)
  unknown1!: number

  @field(FieldType.byte, 31)
  unknown2!: number

  @field(FieldType.uint, 32, 4)
  loot1SurveillanceResult!: number

  @field(FieldType.uint, 36, 4)
  loot2SurveillanceResult!: number

  @field(FieldType.uint, 40, 4)
  loot1RetrievalResult!: number

  @field(FieldType.uint, 44, 4)
  loot2RetrievalResult!: number

  @field(FieldType.uint, 48, 4)
  loot1ItemDiscoveryDescription!: number

  @field(FieldType.uint, 52, 4)
  loot2ItemDiscoveryDescription!: number
}

export class SubmarineExplorationResult extends Struct {
  @field(FieldType.uint, 0, 2)
  rating!: number

  @field(FieldType.uint, 2, 2)
  submarineSpeed!: number

  @field(FieldType.array, 4, 5 * SubmarineExplorationResultEntry.byteLength)
  @child(SubmarineExplorationResultEntry)
  explorationResult!: SubmarineExplorationResultEntry[]

  @field(FieldType.uint, 284, 4)
  unknown3!: number
}

export class SubmarineProgressionStatus extends Struct {
  @field(FieldType.byte, 0)
  unlockedSubmarineCount!: number

  @field(FieldType.bytes, 1, 15)
  unlockedSectors!: Buffer

  @field(FieldType.bytes, 16, 15)
  exploredSectors!: Buffer
}
