import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format, ipcEnum } from '@/struct/struct.decorator'
import { ItemLocation } from './common/inventory'

const ItemQuality = {
  NormalQuality: 0,
  HighQuality: 1,
  CompanyCrestApplied: 2,
  Relic: 4,
  Collectables: 8,
} as const

@ipcEnum('ItemLocation', ItemLocation)
@ipcEnum('ItemQuality', ItemQuality)
export class UpdateInventorySlot extends Struct {
  @field(FieldType.uint, 0, 4)
  index!: number

  @field(FieldType.uint, 4, 4)
  unknown0!: number

  @field(FieldType.uint, 8, 2)
  @format({ enum: 'ItemLocation' })
  containerId!: number

  @field(FieldType.uint, 10, 2)
  slot!: number

  @field(FieldType.uint, 12, 4)
  @format({ append: 'val' })
  quantity!: number

  @field(FieldType.uint, 16, 4)
  @format({ db: 'Item', append: 'enum' })
  catalogId!: number

  @field(FieldType.uint, 20, 4)
  reservedFlag!: number

  @field(FieldType.biguint, 24)
  signatureId!: bigint

  @field(FieldType.byte, 32)
  @format({ enum: 'ItemQuality', append: 'enum' })
  quality!: number

  @field(FieldType.byte, 33)
  attribute2!: number

  // Raw durability: 30000 is full; zero is broken.
  @field(FieldType.uint, 34, 2)
  condition!: number

  @field(FieldType.uint, 36, 2)
  spiritbond!: number

  @field(FieldType.uint, 38, 2)
  unknown38!: number

  @field(FieldType.uint, 40, 4)
  @format({ db: 'Item' })
  glamourCatalogId!: number

  @field(FieldType.uint, 44, 2)
  materia1!: number

  @field(FieldType.uint, 46, 2)
  materia2!: number

  @field(FieldType.uint, 48, 2)
  materia3!: number

  @field(FieldType.uint, 50, 2)
  materia4!: number

  @field(FieldType.uint, 52, 2)
  materia5!: number

  @field(FieldType.byte, 54)
  materia1Tier!: number

  @field(FieldType.byte, 55)
  materia2Tier!: number

  @field(FieldType.byte, 56)
  materia3Tier!: number

  @field(FieldType.byte, 57)
  materia4Tier!: number

  @field(FieldType.byte, 58)
  materia5Tier!: number

  @field(FieldType.byte, 59)
  stain!: number

  @field(FieldType.byte, 60)
  stain2!: number

  @field(FieldType.bytes, 61, 3)
  unknown61!: Buffer
}

export class ItemInfo extends UpdateInventorySlot {}
