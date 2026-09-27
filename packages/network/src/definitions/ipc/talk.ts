import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'
import { createListStructFactory } from './factory/list'

class BattleTalkHeader extends Struct {
  static byteLength = 32

  @field(FieldType.biguint, 0)
  actorId!: bigint

  @field(FieldType.uint, 8, 4)
  eventId!: number

  @field(FieldType.uint, 12, 4)
  nameId!: number

  @field(FieldType.uint, 16, 4)
  messageId!: number

  @field(FieldType.uint, 20, 4)
  duration!: number

  @field(FieldType.uint, 24, 4)
  unknown1!: number

  @field(FieldType.byte, 28)
  kind!: number

  @field(FieldType.byte, 29)
  unknown2!: number

  @field(FieldType.byte, 30)
  paramCount!: number

  @field(FieldType.byte, 31)
  padding!: number
}
class BalloonTalkHeader extends Struct {
  static byteLength = 36

  @field(FieldType.uint, 0, 4)
  eventId!: number

  @field(FieldType.uint, 4, 4)
  padding1!: number

  @field(FieldType.biguint, 8)
  actorId!: bigint

  @field(FieldType.uint, 16, 4)
  messageId!: number

  @field(FieldType.uint, 20, 4)
  duration!: number

  @field(FieldType.byte, 24)
  flag1!: number

  @field(FieldType.bytes, 25, 3)
  padding2!: Buffer

  @field(FieldType.uint, 28, 4)
  unknown!: number

  @field(FieldType.byte, 32)
  flag2!: number

  @field(FieldType.byte, 33)
  paramCount!: number

  @field(FieldType.uint, 34, 2)
  padding3!: number
}
const battle = createListStructFactory(BattleTalkHeader, 32, FieldType.uint, 4)
const balloon = createListStructFactory(
  BalloonTalkHeader,
  36,
  FieldType.uint,
  4,
)
export const BattleTalk2 = battle(2)
export const BalloonTalk2 = balloon(2)
BalloonTalk2.byteLength = 48
export const BattleTalk4 = battle(4)
export const BalloonTalk4 = balloon(4)
BalloonTalk4.byteLength = 56
export const BattleTalk8 = battle(8)
export const BalloonTalk8 = balloon(8)
BalloonTalk8.byteLength = 72
