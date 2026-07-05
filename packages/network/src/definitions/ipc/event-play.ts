import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format } from '@/struct/struct.decorator'
import { createListStructFactory } from './factory/list'

class EventPlayHeader extends Struct {
  static byteLength = 28

  @field(FieldType.biguint, 0)
  @format({ base: 'HEX' })
  actorId!: bigint

  @field(FieldType.uint, 8, 4)
  eventId!: number

  @field(FieldType.uint, 12, 2)
  scene!: number

  @field(FieldType.uint, 14, 2)
  padding!: number

  @field(FieldType.uint, 16, 4)
  sceneFlags!: number

  @field(FieldType.uint, 20, 4)
  unknown!: number

  @field(FieldType.byte, 24)
  paramSize!: number

  @field(FieldType.byte, 25)
  padding1!: number

  @field(FieldType.uint, 26, 2)
  padding2!: number
}

const factory = createListStructFactory(
  EventPlayHeader,
  EventPlayHeader.byteLength,
  FieldType.uint,
  4,
)

export const EventPlay = factory(1)
export const EventPlay4 = factory(4)
export const EventPlay32 = factory(32)
