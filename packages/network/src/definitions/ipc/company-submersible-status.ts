import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field, format } from '@/struct/struct.decorator'

export class CompanySubmersibleStatusItem extends Struct {
  static byteLength = 36

  @field(FieldType.uint, 0, 4)
  returnTime!: number

  @field(FieldType.uint, 4, 2)
  maxDistance!: number

  @field(FieldType.uint, 6, 2)
  unknown2!: number

  @field(FieldType.string, 8, 23)
  @format({ append: 'val', check_length: true })
  name!: string

  @field(FieldType.byte, 31)
  dest1!: number

  @field(FieldType.byte, 32)
  dest2!: number

  @field(FieldType.byte, 33)
  dest3!: number

  @field(FieldType.byte, 34)
  dest4!: number

  @field(FieldType.byte, 35)
  dest5!: number
}

export class CompanySubmersibleStatus extends Struct {
  @field(FieldType.array, 0, 4 * CompanySubmersibleStatusItem.byteLength)
  @child(CompanySubmersibleStatusItem)
  companySubmersibleStatusItem!: CompanySubmersibleStatusItem[]
}
