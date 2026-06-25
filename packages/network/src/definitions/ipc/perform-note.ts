import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class PerformNote extends Struct {
  @field(FieldType.int, 0, 1)
  length!: number
}
