import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class SetOnlineStatus extends Struct {
  @field(FieldType.biguint, 0)
  onlineStatusFlags!: bigint
}
