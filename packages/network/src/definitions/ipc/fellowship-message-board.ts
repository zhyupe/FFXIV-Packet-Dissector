import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field, format } from '@/struct/struct.decorator'

class FellowshipMessageBoardItem extends Struct {
  static byteLength = 152

  @field(FieldType.biguint, 0)
  @format({ base: Base.HEX })
  uniqueId!: bigint

  @field(FieldType.uint, 8, 4)
  time!: number

  @field(FieldType.uint, 12, 2)
  @format({ db: 'server' })
  userServer!: number

  @field(FieldType.byte, 14)
  unknown0!: number

  @field(FieldType.byte, 15)
  emotion!: number

  @field(FieldType.uint, 16, 2)
  index!: number

  @field(FieldType.string, 18, 32)
  nickname!: string

  @field(FieldType.string, 50, 102)
  content!: string
}

export class FellowshipMessageBoard extends Struct {
  @field(FieldType.biguint, 0)
  id!: bigint

  @field(FieldType.uint, 8, 4)
  unknown0!: number

  @field(FieldType.uint, 12, 2)
  nextOffset!: number

  @field(FieldType.uint, 14, 2)
  currentOffset!: number

  @field(FieldType.array, 16, 10 * FellowshipMessageBoardItem.byteLength)
  @child(FellowshipMessageBoardItem)
  fellowshipMessageBoardItem!: FellowshipMessageBoardItem[]
}
