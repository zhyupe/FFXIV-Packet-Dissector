import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format } from '@/struct/struct.decorator'

export class FishCaught extends Struct {
  @field(FieldType.uint, 0, 4)
  @format({ db: 'Item', append: 'enum' })
  declare itemId: number

  @field(FieldType.uint, 4, 2)
  declare size: number

  @field(FieldType.uint, 6, 2)
  declare unknown: number

  @field(FieldType.uint, 8, 4)
  declare unknown2: number

  @field(FieldType.uint, 12, 4)
  declare flags: number
}
