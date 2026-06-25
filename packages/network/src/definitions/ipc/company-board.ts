import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class CompanyBoard extends Struct {
  @field(FieldType.byte, 0)
  unknown!: number

  @field(FieldType.string, 1)
  content!: string
}
