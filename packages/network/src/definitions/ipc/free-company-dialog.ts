import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { dissector, field } from '@/struct/struct.decorator'

export class FreeCompanyDialog extends Struct {
  @field(FieldType.biguint, 0)
  freeCompanyId!: bigint

  @field(FieldType.uint, 8, 4)
  fcIcon!: number

  @field(FieldType.uint, 12, 4)
  unknown2!: number

  @field(FieldType.biguint, 16)
  unknown3!: bigint

  @field(FieldType.biguint, 24)
  fcCredits!: bigint

  @field(FieldType.biguint, 32)
  unknown4!: bigint

  @field(FieldType.uint, 40, 4)
  unknown5!: number

  @field(FieldType.uint, 44, 4)
  unknown6!: number

  @field(FieldType.byte, 48)
  unknown7!: number

  @field(FieldType.byte, 49)
  fcRank!: number

  @field(FieldType.string, 50, 21)
  @dissector({ append: 'val' })
  fcName!: string

  @field(FieldType.byte, 71)
  padding1!: number

  @field(FieldType.string, 72, 6)
  @dissector({ append: 'val' })
  fcTag!: string

  @field(FieldType.byte, 78)
  padding2!: number
}
