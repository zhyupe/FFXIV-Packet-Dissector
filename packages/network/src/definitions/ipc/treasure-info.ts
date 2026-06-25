import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class TreasureInfo extends Struct {
  @field(FieldType.uint, 0, 4)
  treasureId!: number

  @field(FieldType.uint, 4, 2)
  inDungeon!: number

  @field(FieldType.byte, 6)
  stage!: number

  @field(FieldType.byte, 7)
  unknown07!: number

  @field(FieldType.uint, 8, 4)
  unknown08!: number

  @field(FieldType.uint, 12, 4)
  unknown12!: number

  @field(FieldType.uint, 16, 4)
  unknown16!: number

  @field(FieldType.uint, 20, 4)
  unknown20!: number
}
