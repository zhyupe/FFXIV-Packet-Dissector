import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field } from '@/struct/struct.decorator'

export class FellowshipNoteItem extends Struct {
  static byteLength = 97

  @field(FieldType.string, 0, 97)
  content!: string
}

export class FellowshipDetail extends Struct {
  @field(FieldType.biguint, 0)
  uniqueId!: bigint

  @field(FieldType.biguint, 8)
  unknown0!: bigint

  @field(FieldType.uint, 16, 4)
  padding0!: number

  @field(FieldType.uint, 20, 4)
  createTime!: number

  @field(FieldType.uint, 24, 4)
  voteEndTime!: number

  @field(FieldType.uint, 28, 4)
  recruitEndTime!: number

  @field(FieldType.uint, 32, 4)
  joinedTime!: number

  @field(FieldType.biguint, 36)
  unknown1!: bigint

  @field(FieldType.bytes, 44, 368)
  bytePadding!: Buffer

  @field(FieldType.array, 412, 5 * FellowshipNoteItem.byteLength)
  @child(FellowshipNoteItem)
  fellowshipNoteItem!: FellowshipNoteItem[]

  @field(FieldType.uint, 897, 4)
  padding2!: number

  @field(FieldType.byte, 901)
  padding3!: number

  @field(FieldType.string, 902, 61)
  name!: string

  @field(FieldType.string, 963, 193)
  boardcast!: string

  @field(FieldType.string, 1156, 36)
  ownerName!: string
}
