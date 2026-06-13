import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'

export class StatusEffect extends Struct {
  static byteLength = 12

  @field(FieldType.uint, 0, 2)
  id!: number

  @field(FieldType.uint, 2, 2)
  extra!: number

  @field(FieldType.float, 4)
  duration!: number

  @field(FieldType.uint, 8, 4)
  actorId!: number
}
