import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, dissector, field } from '@/struct/struct.decorator'

export class FellowshipJoinedItem extends Struct {
  static byteLength = 80

  @field(FieldType.biguint, 0)
  @dissector({ base: 'HEX' })
  uniqueId!: bigint

  @field(FieldType.biguint, 8)
  unknown0!: bigint

  @field(FieldType.byte, 16)
  unknown1!: number

  @field(FieldType.string, 17, 62)
  name!: string

  @field(FieldType.byte, 79)
  padding!: number
}

export class FellowshipJoined extends Struct {
  @field(FieldType.array, 0, 10 * FellowshipJoinedItem.byteLength)
  @child(FellowshipJoinedItem)
  fellowshipJoinedItem!: FellowshipJoinedItem[]
}
