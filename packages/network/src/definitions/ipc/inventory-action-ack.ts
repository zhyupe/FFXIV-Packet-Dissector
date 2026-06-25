import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class InventoryActionAck extends Struct {
  @field(FieldType.uint, 0, 4)
  sequence!: number

  @field(FieldType.uint, 4, 4)
  type!: number

  @field(FieldType.uint, 8, 4)
  unknown1!: number

  @field(FieldType.uint, 12, 4)
  unknown2!: number
}
