import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format } from '@/struct/struct.decorator'

export class FauxHollowHandler extends Struct {
  @field(FieldType.uint, 0, 4)
  unknown1!: number

  @field(FieldType.uint, 4, 4)
  unknown2!: number

  @field(FieldType.uint, 8, 4)
  unknown3!: number

  @field(FieldType.uint, 12, 4)
  @format({ append: 'val' })
  row!: number

  @field(FieldType.uint, 16, 4)
  @format({ append: 'val' })
  column!: number

  @field(FieldType.uint, 20, 4)
  unknown4!: number

  @field(FieldType.uint, 24, 4)
  unknown5!: number

  @field(FieldType.uint, 28, 4)
  unknown6!: number
}
