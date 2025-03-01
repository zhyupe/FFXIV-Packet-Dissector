import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'

export class EffectEntity extends Struct {
  static byteLength = 8

  @field(FieldType.byte, 0)
  type!: number

  @field(FieldType.byte, 1)
  severity!: number

  @field(FieldType.byte, 2)
  param!: number

  @field(FieldType.byte, 3)
  bonusPercent!: number

  @field(FieldType.byte, 4)
  extendValue!: number

  @field(FieldType.byte, 5)
  flags!: number

  @field(FieldType.uint, 6, 2)
  value!: number

  @field(FieldType.uint, 0, 4)
  data0!: number

  @field(FieldType.uint, 4, 4)
  data1!: number
}
