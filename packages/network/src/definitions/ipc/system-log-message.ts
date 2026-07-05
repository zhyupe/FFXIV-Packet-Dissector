import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format } from '@/struct/struct.decorator'
import { eventField } from './common/event'

export class SystemLogMessage extends Struct {
  @field(FieldType.uint, 0, 4)
  @format({ enum: 'EventId', append: 'enum' })
  eventId!: number

  @field(FieldType.uint, 4, 4)
  @eventField('systemLogParam1')
  param1!: number

  @field(FieldType.uint, 8, 4)
  actionTimeline!: number

  @field(FieldType.uint, 12, 4)
  @eventField('systemLogParam3')
  param3!: number
}
