import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, dissector, field } from '@/struct/struct.decorator'

export class CompanyLevelItem extends Struct {
  static byteLength = 35

  @field(FieldType.uint, 0, 2)
  members!: number

  @field(FieldType.byte, 2)
  index!: number

  @field(FieldType.string, 3, 32)
  @dissector({ append: 'val' })
  name!: string
}

export class CompanyLevel extends Struct {
  @field(FieldType.string, 0, 32)
  captain!: string

  @field(FieldType.array, 32, 15 * CompanyLevelItem.byteLength)
  @child(CompanyLevelItem)
  companyLevelItem!: CompanyLevelItem[]
}
