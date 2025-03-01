import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'

export class UpdateHpMpTp extends Struct {
  @field(FieldType.uint, 0, 4)
  hp!: number

  @field(FieldType.uint, 4, 2)
  mp!: number

  @field(FieldType.uint, 6, 2)
  tp!: number
}
