import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class ContentFinderMemberStatus extends Struct {
  @field(FieldType.uint, 0, 2)
  contentId!: number

  @field(FieldType.uint, 2, 2)
  unknown1!: number

  @field(FieldType.byte, 4)
  status!: number

  @field(FieldType.byte, 5)
  currentTank!: number

  @field(FieldType.byte, 6)
  currentDps!: number

  @field(FieldType.byte, 7)
  currentHealer!: number

  @field(FieldType.byte, 8)
  estimatedTime!: number

  @field(FieldType.byte, 9)
  unknown20!: number

  @field(FieldType.byte, 9)
  unknown21!: number

  @field(FieldType.byte, 9)
  unknown22!: number

  @field(FieldType.uint, 12, 4)
  unknown3!: number
}
