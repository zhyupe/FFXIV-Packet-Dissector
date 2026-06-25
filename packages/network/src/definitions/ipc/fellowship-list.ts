import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, dissector, field } from '@/struct/struct.decorator'

class FellowshipMessageBoardItem extends Struct {
  static byteLength = 172

  @field(FieldType.biguint, 0)
  @dissector({ base: 'HEX' })
  uniqueId!: bigint

  @field(FieldType.uint, 8, 4)
  time!: number

  @field(FieldType.uint, 12, 2)
  @dissector({ db: 'server' })
  userServer!: number

  @field(FieldType.byte, 14)
  unknown0!: number

  @field(FieldType.byte, 15)
  emotion!: number

  @field(FieldType.uint, 16, 2)
  index!: number

  @field(FieldType.string, 18, 32)
  nickname!: string

  @field(FieldType.string, 50, 122)
  content!: string
}

export class FellowshipList extends Struct {
  @field(FieldType.biguint, 0)
  id!: bigint

  @field(FieldType.uint, 8, 4)
  createTime!: number

  @field(FieldType.uint, 12, 4)
  joinTime!: number

  @field(FieldType.array, 16, 10 * FellowshipMessageBoardItem.byteLength)
  @child(FellowshipMessageBoardItem)
  fellowshipMessageBoardItem!: FellowshipMessageBoardItem[]
}
