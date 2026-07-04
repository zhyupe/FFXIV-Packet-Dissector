import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class Logout extends Struct {
  @field(FieldType.uint, 0, 4)
  flags1!: number

  @field(FieldType.uint, 4, 4)
  flags2!: number
}
