import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class InventoryModifyHandler extends Struct {
  @field(FieldType.uint, 0, 4)
  sequence!: number

  @field(FieldType.uint, 4, 2)
  action!: number

  @field(FieldType.uint, 12, 2)
  fromContainer!: number

  @field(FieldType.byte, 16)
  fromSlot!: number

  @field(FieldType.uint, 32, 2)
  toContainer!: number

  @field(FieldType.byte, 36)
  toSlot!: number

  @field(FieldType.uint, 40, 4)
  splitCount!: number
}
