import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class FellowshipMemberSetGroupHandler extends Struct {
  @field(FieldType.biguint, 0)
  id!: bigint

  @field(FieldType.biguint, 8)
  target!: bigint

  @field(FieldType.uint, 16, 4)
  group!: number

  @field(FieldType.uint, 20, 4)
  unknown3!: number
}
