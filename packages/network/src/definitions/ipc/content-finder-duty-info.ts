import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class ContentFinderDutyInfo extends Struct {
  @field(FieldType.byte, 0)
  penaltyTime!: number

  @field(FieldType.byte, 1)
  unknown1!: number

  @field(FieldType.uint, 2, 2)
  unknown2!: number

  @field(FieldType.uint, 4, 4)
  unknown3!: number
}
