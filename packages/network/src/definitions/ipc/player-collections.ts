import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field } from '@/struct/struct.decorator'

export class GatheringLog extends Struct {
  static byteLength = 104

  @field(FieldType.bytes, 0, 104)
  gatheredItemFlags!: Buffer
}
export class CraftingLog extends Struct {
  static byteLength = 801

  @field(FieldType.bytes, 0, 801)
  completedRecipeFlags!: Buffer
}
export class TitleList extends Struct {
  static byteLength = 116

  @field(FieldType.bytes, 0, 116)
  unlockedTitleFlags!: Buffer
}
export class PlayerBlueMageActions extends Struct {
  static byteLength = 96

  @field(FieldType.array, 0, 96)
  @child({ type: FieldType.uint, byteLength: 4 })
  actions!: number[]
}
