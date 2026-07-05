import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field, format, ipcIf } from '@/struct/struct.decorator'

@ipcIf('materiaId')
export class ExamineItemMateria extends Struct {
  static byteLength = 4

  @field(FieldType.uint, 0, 2)
  materiaId!: number

  @field(FieldType.uint, 2, 2)
  tier!: number
}

@ipcIf('catalogId')
export class ExamineItemData extends Struct {
  static byteLength = 40

  @field(FieldType.uint, 0, 4)
  @format({ db: 'Item', append: 'enum' })
  catalogId!: number

  @field(FieldType.uint, 4, 4)
  @format({ db: 'Item', append: 'enum' })
  appearance!: number

  @field(FieldType.biguint, 8)
  crafterId!: bigint

  @field(FieldType.byte, 16)
  quality!: number

  @field(FieldType.byte, 17)
  unknown!: number

  @field(FieldType.array, 18, 5 * ExamineItemMateria.byteLength)
  @child(ExamineItemMateria)
  examineItemMateria!: ExamineItemMateria[]

  @field(FieldType.uint, 38, 2)
  unknown2!: number
}

export class Examine extends Struct {
  @field(FieldType.uint, 0, 2)
  unknown0!: number

  @field(FieldType.int, 2, 1)
  @format({ db: 'ClassJob' })
  classJob!: number

  @field(FieldType.int, 3, 1)
  level!: number

  @field(FieldType.uint, 4, 2)
  padding!: number

  @field(FieldType.uint, 6, 2)
  @format({ db: 'TitleMasculine' })
  title!: number

  @field(FieldType.int, 8, 1)
  grandCompany!: number

  @field(FieldType.int, 9, 1)
  grandCompanyRank!: number

  @field(FieldType.uint, 16, 4)
  u6FromPSpawn!: number

  @field(FieldType.uint, 20, 4)
  u7FromPSpawn!: number

  @field(FieldType.biguint, 32)
  mainWeaponModel!: bigint

  @field(FieldType.biguint, 40)
  secWeaponModel!: bigint

  @field(FieldType.uint, 48, 2)
  unknown2!: number

  @field(FieldType.uint, 50, 2)
  @format({ db: 'World' })
  world!: number

  @field(FieldType.array, 64, 14 * ExamineItemData.byteLength)
  @child(ExamineItemData)
  examineItemData!: ExamineItemData[]

  @field(FieldType.string, 624, 32)
  @format({ append: 'val', check_length: true })
  nickname!: string
}
