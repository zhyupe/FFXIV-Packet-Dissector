import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field } from '@/struct/struct.decorator'

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
