import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format, ipcEnum } from '@/struct/struct.decorator'

@ipcEnum('InventoryTransactionType', {
  UpdateTargetSlot: 0x200,
  UpdateSourceSlot: 0x201,
  ClearSourceSlot: 0x202,
  InvalidateContainer: 0x20e,
})
export class InventoryTransaction extends Struct {
  @field(FieldType.uint, 0, 4)
  sequence!: number

  @field(FieldType.uint, 4, 4)
  @format({ enum: 'InventoryTransactionType' })
  type!: number

  @field(FieldType.uint, 8, 4)
  @format({ base: Base.HEX })
  ownerId!: number

  @field(FieldType.uint, 12, 4)
  @format({ enum: 'ItemLocation', append: 'enum' })
  storageId!: number

  @field(FieldType.int, 16, 2)
  slotId!: number

  @field(FieldType.bytes, 18, 2)
  unknown18!: Buffer

  @field(FieldType.uint, 20, 4)
  @format({ append: 'val' })
  stackSize!: number

  @field(FieldType.uint, 24, 4)
  @format({ db: 'Item', append: 'enum' })
  catalogId!: number

  @field(FieldType.uint, 28, 4)
  @format({ base: Base.HEX })
  someActorId!: number

  // Operation 0x200 updates the target slot; 0x201 updates the source slot.
  // Operation 0x202 clears the source slot. Quantities are resulting slot values.
  @field(FieldType.uint, 32, 4)
  @format({ enum: 'ItemLocation', append: 'enum' })
  targetStorageId!: number

  @field(FieldType.int, 36, 2)
  targetSlotId!: number

  @field(FieldType.bytes, 38, 2)
  unknown38!: Buffer

  @field(FieldType.uint, 40, 4)
  targetStackSize!: number

  @field(FieldType.uint, 44, 4)
  @format({ db: 'Item', append: 'enum' })
  targetCatalogId!: number
}
