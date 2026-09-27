import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field } from '@/struct/struct.decorator'

export class PlaceFieldMarkerPreset extends Struct {
  static byteLength = 104

  @field(FieldType.byte, 0)
  activeMask!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 32)
  @child({ type: FieldType.int, byteLength: 4 })
  x!: number[]

  @field(FieldType.array, 36, 32)
  @child({ type: FieldType.int, byteLength: 4 })
  y!: number[]

  @field(FieldType.array, 68, 32)
  @child({ type: FieldType.int, byteLength: 4 })
  z!: number[]
}
