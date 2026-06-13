import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class SubmarineStatusItem extends Struct {
  static byteLength = 60

  @field(FieldType.uint, 0, 2)
  status!: number

  @field(FieldType.uint, 2, 2)
  rank!: number

  @field(FieldType.uint, 4, 4)
  birthdate!: number

  @field(FieldType.uint, 8, 4)
  returnTime!: number

  @field(FieldType.uint, 12, 4)
  currentExp!: number

  @field(FieldType.uint, 16, 4)
  totalExpForNextRank!: number

  @field(FieldType.uint, 20, 2)
  capacity!: number

  @field(FieldType.string, 22, 20)
  name!: string

  @field(FieldType.uint, 42, 2)
  padding1!: number

  @field(FieldType.uint, 44, 2)
  padding2!: number

  @field(FieldType.uint, 46, 2)
  hull!: number

  @field(FieldType.uint, 48, 2)
  stern!: number

  @field(FieldType.uint, 50, 2)
  bow!: number

  @field(FieldType.uint, 52, 2)
  bridge!: number

  @field(FieldType.byte, 54)
  dest1!: number

  @field(FieldType.byte, 55)
  dest2!: number

  @field(FieldType.byte, 56)
  dest3!: number

  @field(FieldType.byte, 57)
  dest4!: number

  @field(FieldType.byte, 58)
  dest5!: number

  @field(FieldType.byte, 59)
  padding3!: number
}
