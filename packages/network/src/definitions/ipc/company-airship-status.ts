import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, dissector, field } from '@/struct/struct.decorator'

export class CompanyAirshipStatusItem extends Struct {
  static byteLength = 36

  @field(FieldType.uint, 0, 4)
  returnTime!: number

  @field(FieldType.uint, 4, 2)
  maxDistance!: number

  @field(FieldType.string, 6, 23)
  @dissector({ append: 'val', check_length: true })
  name!: string

  @field(FieldType.byte, 29)
  dest1!: number

  @field(FieldType.byte, 30)
  dest2!: number

  @field(FieldType.byte, 31)
  dest3!: number

  @field(FieldType.byte, 32)
  dest4!: number

  @field(FieldType.byte, 33)
  dest5!: number

  @field(FieldType.uint, 34, 2)
  unknown3!: number
}

export class CompanyAirshipStatus extends Struct {
  @field(FieldType.array, 0, 4 * CompanyAirshipStatusItem.byteLength)
  @child(CompanyAirshipStatusItem)
  companyAirshipStatusItem!: CompanyAirshipStatusItem[]
}
