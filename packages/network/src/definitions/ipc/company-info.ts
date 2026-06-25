import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { dissector, field } from '@/struct/struct.decorator'

export class CompanyInfo extends Struct {
  @field(FieldType.uint, 24, 4)
  credits!: number

  @field(FieldType.uint, 44, 2)
  members!: number

  @field(FieldType.uint, 46, 2)
  onlineMembers!: number

  @field(FieldType.string, 50, 22)
  @dissector({ append: 'val' })
  name!: string

  @field(FieldType.string, 72, 8)
  @dissector({ append: 'val' })
  tag!: string
}
