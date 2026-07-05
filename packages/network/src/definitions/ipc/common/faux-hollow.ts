import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format } from '@/struct/struct.decorator'

export class FauxHollowBlock extends Struct {
  static byteLength = 8

  @field(FieldType.uint, 0, 4)
  @format({ append: 'val' })
  Row!: number

  @field(FieldType.uint, 4, 4)
  @format({ append: 'val' })
  Column!: number
}
