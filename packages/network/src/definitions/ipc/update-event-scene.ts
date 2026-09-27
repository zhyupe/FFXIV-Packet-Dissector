import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'
import { createListStructFactory } from './factory/list'

class UpdateEventSceneHeader extends Struct {
  static byteLength = 8

  @field(FieldType.uint, 0, 4)
  eventId!: number

  @field(FieldType.uint, 4, 2)
  scene!: number

  // Only the first paramCount uint32 entries are scene parameters.
  @field(FieldType.byte, 6)
  paramCount!: number

  @field(FieldType.byte, 7)
  unknown!: number
}

const factory = createListStructFactory(
  UpdateEventSceneHeader,
  8,
  FieldType.uint,
  4,
)

export const UpdateEventScene2 = factory(2)
export const UpdateEventScene4 = factory(4)
export const UpdateEventScene8 = factory(8)
export const UpdateEventScene16 = factory(16)
