import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format } from '@/struct/struct.decorator'

export class InventoryTransaction extends Struct {
  @field(FieldType.uint, 0, 4)
  sequence!: number

  @field(FieldType.uint, 4, 4)
  type!: number

  @field(FieldType.uint, 8, 4)
  @format({ base: Base.HEX })
  ownerId!: number

  @field(FieldType.uint, 12, 4)
  @format({ enum: 'ItemLocation', append: 'enum' })
  storageId!: number

  @field(FieldType.uint, 16, 4)
  slotId!: number

  @field(FieldType.uint, 20, 4)
  @format({ append: 'val' })
  stackSize!: number

  @field(FieldType.uint, 24, 4)
  @format({ db: 'Item', append: 'enum' })
  catalogId!: number

  @field(FieldType.uint, 28, 4)
  @format({ base: Base.HEX })
  someActorId!: number

  @field(FieldType.uint, 32, 4)
  @format({ base: Base.HEX })
  targetStorageId!: number
}
