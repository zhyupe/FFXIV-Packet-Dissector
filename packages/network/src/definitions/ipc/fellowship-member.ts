import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field, format } from '@/struct/struct.decorator'

export class FellowshipMemberItem extends Struct {
  static byteLength = 56

  @field(FieldType.biguint, 0)
  @format({ base: Base.HEX })
  uniqueId!: bigint

  @field(FieldType.uint, 8, 4)
  time!: number

  @field(FieldType.uint, 12, 2)
  @format({ db: 'server' })
  userServer!: number

  @field(FieldType.uint, 14, 2)
  @format({ db: 'server' })
  userServer2!: number

  @field(FieldType.uint, 16, 2)
  unknown1!: number

  @field(FieldType.byte, 18)
  level!: number

  @field(FieldType.byte, 19)
  group!: number

  @field(FieldType.uint, 20, 2)
  unknown3!: number

  @field(FieldType.byte, 22)
  unknown4!: number

  @field(FieldType.string, 23, 32)
  nickname!: string

  @field(FieldType.byte, 55)
  padding!: number
}

export class FellowshipMember extends Struct {
  @field(FieldType.biguint, 0)
  id!: bigint

  @field(FieldType.uint, 8, 4)
  unknown0!: number

  @field(FieldType.uint, 12, 4)
  unknown1!: number

  @field(FieldType.uint, 16, 4)
  unknown2!: number

  @field(FieldType.uint, 20, 4)
  unknownTime!: number

  @field(FieldType.uint, 24, 4)
  unknown3!: number

  @field(FieldType.uint, 28, 4)
  unknown4!: number

  @field(FieldType.array, 32, 8 * FellowshipMemberItem.byteLength)
  @child(FellowshipMemberItem)
  fellowshipMemberItem!: FellowshipMemberItem[]
}
