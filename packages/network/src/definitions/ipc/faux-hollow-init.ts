import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field } from '@/struct/struct.decorator'
import { FauxHollowBlock } from './common/faux-hollow'

export class FauxHollowInit extends Struct {
  @field(FieldType.uint, 0, 4)
  unknown1!: number

  @field(FieldType.uint, 4, 4)
  unknown2!: number

  @field(FieldType.uint, 8, 4)
  unknown3!: number

  @field(FieldType.uint, 12, 4)
  unknown4!: number

  @field(FieldType.uint, 16, 4)
  unknown5!: number

  @field(FieldType.uint, 20, 4)
  unknown6!: number

  @field(FieldType.uint, 24, 4)
  unknown7!: number

  @field(FieldType.uint, 28, 4)
  chance!: number

  @field(FieldType.array, 36, 5 * FauxHollowBlock.byteLength)
  @child(FauxHollowBlock)
  fauxHollowBlock!: FauxHollowBlock[]

  @field(FieldType.biguint, 88)
  timestamp1!: bigint

  @field(FieldType.biguint, 80)
  timestamp2!: bigint
}
