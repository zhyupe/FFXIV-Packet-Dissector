import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { dissector, field } from '@/struct/struct.decorator'

export class FauxHollowBlock extends Struct {
  static byteLength = 8

  @field(FieldType.uint, 0, 4)
  @dissector({ append: 'val' })
  Row!: number

  @field(FieldType.uint, 4, 4)
  @dissector({ append: 'val' })
  Column!: number
}
