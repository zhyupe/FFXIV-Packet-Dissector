import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'

export class Position extends Struct {
  static byteLength = 12

  @field(FieldType.float, 0)
  x!: number

  @field(FieldType.float, 4)
  y!: number

  @field(FieldType.float, 8)
  z!: number
}
