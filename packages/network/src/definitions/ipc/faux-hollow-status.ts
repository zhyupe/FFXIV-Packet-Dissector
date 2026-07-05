import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field, format } from '@/struct/struct.decorator'
import { FauxHollowBlock } from './common/faux-hollow'

export class FauxHollowStatus extends Struct {
  @field(FieldType.uint, 0, 4)
  unknown1!: number

  @field(FieldType.uint, 4, 4)
  unknown2!: number

  @field(FieldType.uint, 8, 4)
  unknown3!: number

  @field(FieldType.uint, 12, 4)
  @format({ append: 'val' })
  value!: number

  @field(FieldType.uint, 16, 4)
  column!: number

  @field(FieldType.uint, 20, 4)
  unknown4!: number

  @field(FieldType.uint, 48, 4)
  @format({ append: 'val' })
  chance!: number

  @field(FieldType.uint, 52, 4)
  unknownStatus1!: number

  @field(FieldType.uint, 56, 4)
  unknownStatus2!: number

  @field(FieldType.array, 60, 4 * FauxHollowBlock.byteLength)
  @child(FauxHollowBlock)
  fauxHollowBlock1!: FauxHollowBlock[]

  @field(FieldType.array, 96, 4 * FauxHollowBlock.byteLength)
  @child(FauxHollowBlock)
  fauxHollowBlock2!: FauxHollowBlock[]

  @field(FieldType.biguint, 136)
  timestamp!: bigint
}
