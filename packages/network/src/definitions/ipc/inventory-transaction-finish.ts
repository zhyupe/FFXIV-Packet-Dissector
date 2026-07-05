import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format } from '@/struct/struct.decorator'

export class InventoryTransactionFinish extends Struct {
  @field(FieldType.uint, 0, 4)
  @format({ append: 'val' })
  sequenceId0!: number

  @field(FieldType.uint, 4, 4)
  sequenceId1!: number

  @field(FieldType.uint, 8, 4)
  unknown1!: number

  @field(FieldType.uint, 12, 4)
  unknown2!: number
}
