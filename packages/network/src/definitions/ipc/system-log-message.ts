import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class SystemLogMessage extends Struct {
  @field(FieldType.uint, 0, 4)
  eventId!: number

  @field(FieldType.uint, 4, 4)
  param1!: number

  @field(FieldType.uint, 8, 4)
  actionTimeline!: number

  @field(FieldType.uint, 12, 4)
  param3!: number
}
