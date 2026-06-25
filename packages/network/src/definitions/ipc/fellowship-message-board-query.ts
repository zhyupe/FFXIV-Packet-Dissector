import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class FellowshipMessageBoardQuery extends Struct {
  @field(FieldType.uint, 0, 4)
  id1!: number

  @field(FieldType.uint, 4, 4)
  id2!: number

  @field(FieldType.uint, 8, 4)
  unknown1!: number

  @field(FieldType.uint, 12, 2)
  offset!: number

  @field(FieldType.uint, 14, 2)
  unknown2!: number
}
