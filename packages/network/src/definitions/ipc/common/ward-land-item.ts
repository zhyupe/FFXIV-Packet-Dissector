import { Struct } from '@/struct/struct'
import { field, child } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'

export class WardLandItem extends Struct {
  static byteLength = 40

  @field(FieldType.uint, 0, 4)
  price!: number

  @field(FieldType.byte, 4)
  type!: number

  @field(FieldType.array, 5, 3)
  @child({ type: FieldType.byte, byteLength: 1 })
  appeal!: number

  @field(FieldType.string, 8, 32)
  name!: string
}
