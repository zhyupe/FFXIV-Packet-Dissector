import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class Ping extends Struct {
  // Low 32 bits of the client's monotonic millisecond clock.
  @field(FieldType.uint, 0, 4)
  clientTime!: number

  @field(FieldType.uint, 4, 4)
  roundTripTime!: number

  @field(FieldType.uint, 8, 4)
  unknown8!: number

  @field(FieldType.bytes, 12, 16)
  unknown12!: Buffer

  @field(FieldType.bytes, 28, 4)
  unknown28!: Buffer
}

export class PingHandler extends Ping {}
