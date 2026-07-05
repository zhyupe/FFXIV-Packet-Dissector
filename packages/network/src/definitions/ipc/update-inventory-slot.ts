import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format, ipcEnum } from '@/struct/struct.decorator'

const ItemLocation = {
  Inventory0: 0,
  Inventory1: 1,
  Inventory2: 2,
  Inventory3: 3,
  ArmouryEquipped: 1000,
  Currency: 2000,
  Crystal: 2001,
  ArmouryOffHand: 3200,
  ArmouryHead: 3201,
  ArmouryBody: 3202,
  ArmouryHands: 3203,
  ArmouryWaist: 3204,
  ArmouryLegs: 3205,
  ArmouryFeet: 3206,
  ArmouryEars: 3207,
  ArmouryNeck: 3208,
  ArmouryWrists: 3209,
  ArmouryRightRing: 3210,
  ArmouryLeftRing: 3211,
  ArmouryRing: 3300,
  SoulCrystal: 3400,
  ArmouryMainHand: 3500,
  Saddlebag0: 4000,
  Saddlebag1: 4001,
} as const

const ItemQuality = {
  NormalQuality: 0,
  HighQuality: 1,
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

  @field(FieldType.uint, 34, 2)
  condition!: number

  @field(FieldType.uint, 36, 2)
  spiritbond!: number

  @field(FieldType.uint, 38, 2)
  stain!: number

  @field(FieldType.uint, 40, 2)
  @format({ db: 'Item' })
  glamourCatalogId!: number

  @field(FieldType.uint, 42, 2)
  unknown6!: number

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
  unknown10!: number

  @field(FieldType.uint, 60, 4)
  unknown11!: number
}

export class ItemInfo extends UpdateInventorySlot {}
