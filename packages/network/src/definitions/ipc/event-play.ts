import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format, ipcEnum } from '@/struct/struct.decorator'
import { EventEnums, eventField } from './common/event'
import { createListStructFactory } from './factory/list'

@ipcEnum(EventEnums)
class EventPlayHeader extends Struct {
  static byteLength = 28

  @field(FieldType.biguint, 0)
  @format({ base: Base.HEX })
  actorId!: bigint

  @field(FieldType.uint, 8, 4)
  @format({
    append: 'enum',
    enum: 'EventId',
  })
  eventId!: number

  @field(FieldType.uint, 12, 2)
  @eventField('playScene')
  scene!: number

  @field(FieldType.uint, 14, 2)
  padding!: number

  @field(FieldType.biguint, 16)
  sceneFlags!: bigint

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
export const EventPlay8 = factory(8)
export const EventPlay16 = factory(16)
export const EventPlay32 = factory(32)
export const EventPlay64 = factory(64)
export const EventPlay128 = factory(128)
export const EventPlay255 = factory(255)

EventPlay.byteLength = 40
EventPlay4.byteLength = 48
EventPlay8.byteLength = 64
EventPlay16.byteLength = 96
EventPlay32.byteLength = 160
EventPlay64.byteLength = 288
EventPlay128.byteLength = 544
EventPlay255.byteLength = 1048
