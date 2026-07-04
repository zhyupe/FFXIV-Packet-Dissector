import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class EventFinish extends Struct {
  @field(FieldType.uint, 0, 4)
  eventId!: number
}
