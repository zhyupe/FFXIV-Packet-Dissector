import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format, ipcEnum } from '@/struct/struct.decorator'

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
