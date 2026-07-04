import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class EventStart extends Struct {
  @field(FieldType.biguint, 0)
  actorId!: bigint

  @field(FieldType.uint, 8, 4)
  eventId!: number
}
