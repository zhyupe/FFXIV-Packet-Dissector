import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class Init extends Struct {
  @field(FieldType.biguint, 0)
  unknown!: bigint

  @field(FieldType.uint, 8, 4)
  charId!: number

  @field(FieldType.uint, 12, 4)
  unknown1!: number
}
