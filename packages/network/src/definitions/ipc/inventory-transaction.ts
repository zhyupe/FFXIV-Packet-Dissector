import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { dissector, field } from '@/struct/struct.decorator'

export class InventoryTransaction extends Struct {
  @field(FieldType.uint, 0, 4)
  sequence!: number

  @field(FieldType.uint, 4, 4)
  type!: number

  @field(FieldType.uint, 8, 4)
  @dissector({ base: 'HEX' })
  ownerId!: number

  @field(FieldType.uint, 12, 4)
  @dissector({ enum: 'ItemLocation', append: 'enum' })
  storageId!: number

  @field(FieldType.uint, 16, 4)
  slotId!: number

  @field(FieldType.uint, 20, 4)
  @dissector({ append: 'val' })
  stackSize!: number

  @field(FieldType.uint, 24, 4)
  @dissector({ db: 'Item', append: 'enum' })
  catalogId!: number

  @field(FieldType.uint, 28, 4)
  @dissector({ base: 'HEX' })
  someActorId!: number

  @field(FieldType.uint, 32, 4)
  @dissector({ base: 'HEX' })
  targetStorageId!: number
}
