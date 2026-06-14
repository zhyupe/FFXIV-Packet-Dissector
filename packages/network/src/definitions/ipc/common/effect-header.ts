import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { dissector, field, ipcEnum } from '@/struct/struct.decorator'
import { ActionEffectDisplayType } from './action-effect-display-type.enum'

@ipcEnum('ActionEffectDisplayType', ActionEffectDisplayType)
export class EffectHeader extends Struct {
  static byteLength = 42

  @field(FieldType.uint, 0, 4)
  animationTargetId!: number

  @field(FieldType.uint, 8, 4)
  @dissector({ db: 'Action' })
  action!: number

  @field(FieldType.uint, 12, 4)
  sequence!: number

  @field(FieldType.float, 16, 4)
  animationLockTime!: number

  @field(FieldType.uint, 20, 4)
  @dissector({ base: 'hex' })
  someTargetId!: number

  @field(FieldType.uint, 24, 2)
  sourceSequence!: number

  @field(FieldType.uint, 26, 2)
  rotation!: number

  @field(FieldType.uint, 28, 2)
  actionAnimationId!: number

  @field(FieldType.byte, 30)
  variation!: number

  @field(FieldType.byte, 31)
  @dissector({ enum: 'ActionEffectDisplayType' })
  effectDisplayType!: number

  @field(FieldType.byte, 33)
  effectCount!: number
}
