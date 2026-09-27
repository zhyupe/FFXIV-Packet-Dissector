import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'
import { createListStructFactory } from './factory/list'

class ResumeEventSceneHeader extends Struct {
  static byteLength = 8

  @field(FieldType.uint, 0, 4)
  eventId!: number

  @field(FieldType.uint, 4, 2)
  scene!: number

  @field(FieldType.byte, 6)
  resumeId!: number

  @field(FieldType.byte, 7)
  paramCount!: number
}
const factory = createListStructFactory(
  ResumeEventSceneHeader,
  8,
  FieldType.uint,
  4,
)
export const ResumeEventScene8 = factory(8)
export const ResumeEventScene16 = factory(16)
export const ResumeEventScene32 = factory(32)
