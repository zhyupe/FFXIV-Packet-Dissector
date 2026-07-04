import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class FreeCompanyInfo extends Struct {
  @field(FieldType.biguint, 0)
  freeCompanyId!: bigint

  @field(FieldType.bytes, 8, 37)
  unknown0!: Buffer

  @field(FieldType.byte, 45)
  rank!: number

  @field(FieldType.bytes, 46, 34)
  unknown1!: Buffer
}
