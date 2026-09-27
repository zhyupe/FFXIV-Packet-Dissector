import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field, format, ipcEnum } from '@/struct/struct.decorator'

export class FashionReport extends Struct {
  @field(FieldType.byte, 0)
  highScore!: number

  @field(FieldType.byte, 1)
  remainingAttempts!: number

  // FashionCheckWeeklyTheme row ID.
  @field(FieldType.uint, 2, 2)
  weeklyTheme!: number

  // FashionCheckThemeCategory row IDs in the client's 11-slot display order.
  // Zero entries are retained to preserve the slot indices.
  @field(FieldType.array, 4, 11 * 2)
  @child({ type: FieldType.uint, byteLength: 2 })
  itemThemes!: number[]

  @field(FieldType.bytes, 26, 6)
  unknownTail!: Buffer
}

@ipcEnum('FashionReportEvaluation', {
  Gold: 0,
  OneStar: 4,
  NoRating: 5,
})
export class FashionReportHighScore extends Struct {
  @field(FieldType.byte, 0)
  score!: number

  @field(FieldType.bytes, 1, 3)
  unknown1!: Buffer

  // Wire item IDs retain quality offsets; the client normalizes them for Item lookup.
  @field(FieldType.array, 4, 11 * 4)
  @child({ type: FieldType.uint, byteLength: 4 })
  @format({ db: 'Item' })
  itemIds!: number[]

  @field(FieldType.array, 0x30, 2 * 2)
  @child({ type: FieldType.uint, byteLength: 2 })
  glassesIds!: number[]

  @field(FieldType.array, 0x34, 6)
  @child({ type: FieldType.byte, byteLength: 1 })
  stain0Ids!: number[]

  @field(FieldType.array, 0x3a, 6)
  @child({ type: FieldType.byte, byteLength: 1 })
  stain1Ids!: number[]

  // Same 11-slot order as itemIds and the preview's itemThemes.
  // The client displays rating icons for 0..4; values >= 5 hide the icon.
  @field(FieldType.array, 0x40, 11)
  @child({ type: FieldType.byte, byteLength: 1 })
  @format({ enum: 'FashionReportEvaluation' })
  itemEvaluations!: number[]

  @field(FieldType.bytes, 0x4b, 5)
  unknownTail!: Buffer
}
