import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field, format, ipcEnum } from '@/struct/struct.decorator'

export class Achievement extends Struct {
  // Set bit N means Achievement row N is complete; points are computed by the UI.
  @field(FieldType.bitset, 0, 510)
  completedAchievementIds!: number[]

  // Newest first, as maintained by Achievement.SetAchievementCompleted.
  @field(FieldType.array, 510, 10)
  @child({ type: FieldType.uint, byteLength: 2 })
  history!: number[]

  // Separate UI-state bitmap. Indices are not achievement IDs; semantics unknown.
  @field(FieldType.bitset, 520, 26)
  auxiliaryFlagIndices!: number[]

  @field(FieldType.bytes, 546, 6)
  unknownTail!: Buffer
}

@ipcEnum('NearCompletionAchievementSlot', {
  LoginNotification: 0,
  AchievementAddon: 1,
})
export class NearCompletionAchievements extends Struct {
  @field(FieldType.uint, 0, 4)
  @format({ enum: 'NearCompletionAchievementSlot' })
  slot!: number

  // Membership only: bit N identifies Achievement row N, not its progress.
  @field(FieldType.bitset, 4, 510)
  achievementIds!: number[]

  @field(FieldType.bytes, 514, 6)
  unknownTail!: Buffer
}
