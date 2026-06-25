import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class UpdatePositionInstance extends Struct {
  @field(FieldType.uint, 0, 4)
  unknown0!: number

  @field(FieldType.uint, 4, 4)
  unknown1!: number

  @field(FieldType.uint, 8, 4)
  unknown2!: number

  @field(FieldType.uint, 12, 4)
  unknown3!: number

  @field(FieldType.uint, 16, 4)
  unknown4!: number

  @field(FieldType.uint, 20, 4)
  unknown5!: number

  @field(FieldType.uint, 24, 4)
  unknown6!: number

  @field(FieldType.uint, 28, 4)
  unknown7!: number

  @field(FieldType.uint, 32, 4)
  unknown8!: number

  @field(FieldType.uint, 36, 4)
  unknown9!: number
}
