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

  @field(FieldType.byte, 12)
  unknown12!: number

  // Number of messages in the transaction group, including this finish message.
  @field(FieldType.byte, 13)
  packetCount!: number

  @field(FieldType.bytes, 14, 2)
  unknown14!: Buffer
}
