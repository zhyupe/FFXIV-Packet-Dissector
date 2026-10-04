import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field } from '@/struct/struct.decorator'

export class EventHandlerReturn extends Struct {
  @field(FieldType.uint, 0, 4)
  eventId!: number

  @field(FieldType.int, 4, 2)
  scene!: number

  @field(FieldType.byte, 6)
  errorCode!: number

  @field(FieldType.byte, 7)
  paramCount!: number

  @field(FieldType.array, 8, 8)
  @child({ type: FieldType.uint, byteLength: 4 })
  params!: number[]
}

// Capacity is four uint32 parameters; paramCount indicates the used entries.
export class EventHandlerReturn4 extends EventHandlerReturn {
  @field(FieldType.array, 8, 16)
  @child({ type: FieldType.uint, byteLength: 4 })
  params!: number[]
}
