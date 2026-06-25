import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class EventHandlerReturn extends Struct {
  @field(FieldType.uint, 0, 4)
  eventId!: number

  @field(FieldType.uint, 4, 2)
  scene!: number

  @field(FieldType.uint, 6, 2)
  param1!: number

  @field(FieldType.uint, 8, 2)
  param2!: number

  @field(FieldType.byte, 10)
  pad_000A0!: number

  @field(FieldType.byte, 11)
  pad_000A1!: number

  @field(FieldType.uint, 12, 2)
  param3!: number

  @field(FieldType.byte, 14)
  pad_000E0!: number

  @field(FieldType.byte, 15)
  pad_000E1!: number

  @field(FieldType.uint, 16, 2)
  param4!: number
}
