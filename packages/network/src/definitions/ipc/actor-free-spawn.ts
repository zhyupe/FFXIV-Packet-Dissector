import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'

export class ActorFreeSpawn extends Struct {
  @field(FieldType.uint, 0, 4)
  unknown!: number

  @field(FieldType.uint, 4, 4)
  targetId!: number
}
