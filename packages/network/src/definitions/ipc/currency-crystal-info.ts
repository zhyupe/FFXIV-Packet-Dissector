import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format } from '@/struct/struct.decorator'

export class CurrencyCrystalInfo extends Struct {
  @field(FieldType.uint, 0, 4)
  containerSequence!: number

  @field(FieldType.uint, 4, 2)
  @format({ enum: 'ItemLocation', append: 'enum' })
  containerId!: number

  @field(FieldType.uint, 6, 2)
  slot!: number

  @field(FieldType.uint, 8, 4)
  @format({ append: 'val' })
  quantity!: number

  @field(FieldType.uint, 12, 4)
  unknown!: number

  @field(FieldType.uint, 16, 4)
  @format({ db: 'Item', append: 'enum' })
  catalogId!: number

  @field(FieldType.uint, 20, 4)
  unknown1!: number

  @field(FieldType.uint, 24, 4)
  unknown2!: number

  @field(FieldType.uint, 28, 4)
  unknown3!: number
}
