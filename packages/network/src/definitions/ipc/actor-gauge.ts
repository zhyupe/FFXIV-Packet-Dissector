import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'

export class ActorGauge extends Struct {
  @field(FieldType.uint, 0, 4)
  param1!: number

  @field(FieldType.uint, 4, 4)
  param2!: number

  @field(FieldType.uint, 8, 4)
  param3!: number

  @field(FieldType.uint, 12, 4)
  param4!: number
}
