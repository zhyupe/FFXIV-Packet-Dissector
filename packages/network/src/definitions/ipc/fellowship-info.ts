import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class FellowshipInfo extends Struct {
  @field(FieldType.biguint, 0)
  id!: bigint

  @field(FieldType.uint, 8, 4)
  unknown1!: number

  @field(FieldType.uint, 12, 4)
  unknown2!: number

  @field(FieldType.uint, 16, 4)
  unknown3!: number

  @field(FieldType.uint, 20, 4)
  createTime!: number

  @field(FieldType.uint, 24, 4)
  voteTime!: number

  @field(FieldType.uint, 28, 4)
  unknown4!: number

  @field(FieldType.uint, 32, 4)
  joinTime!: number
}
