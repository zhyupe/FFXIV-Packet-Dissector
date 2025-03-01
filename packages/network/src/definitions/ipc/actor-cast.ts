import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'

export class ActorCast extends Struct {
  @field(FieldType.uint, 0, 2)
  action!: number

  @field(FieldType.byte, 2)
  skillType!: number

  @field(FieldType.uint, 4, 4)
  itemId!: number

  @field(FieldType.float, 8)
  castTime!: number

  @field(FieldType.uint, 12, 4)
  targetId!: number

  @field(FieldType.float, 16)
  rotation!: number

  @field(FieldType.uint, 24, 2)
  x!: number

  @field(FieldType.uint, 26, 2)
  y!: number

  @field(FieldType.uint, 28, 2)
  z!: number
}
