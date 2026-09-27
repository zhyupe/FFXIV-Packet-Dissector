import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'
import { createListStructFactory } from './factory/list'

class YieldEventSceneHeader extends Struct {
  static byteLength = 8

  @field(FieldType.uint, 0, 4)
  eventId!: number

  @field(FieldType.uint, 4, 2)
  scene!: number

  @field(FieldType.byte, 6)
  yieldId!: number

  // Only the first paramCount uint32 entries are return parameters.
  @field(FieldType.byte, 7)
  paramCount!: number
}

const factory = createListStructFactory(
  YieldEventSceneHeader,
  8,
  FieldType.uint,
  4,
)

export const YieldEventScene2 = factory(2)
export const YieldEventScene4 = factory(4)
export const YieldEventScene8 = factory(8)
