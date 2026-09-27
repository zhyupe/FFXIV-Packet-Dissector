import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field } from '@/struct/struct.decorator'

export class CFPreferredRole extends Struct {
  @field(FieldType.array, 0, 16)
  @child({ type: FieldType.byte, byteLength: 1 })
  roles!: number[]
}
