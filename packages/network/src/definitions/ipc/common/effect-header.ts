import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'

export class EffectHeader extends Struct {
  static byteLength = 42

  @field(FieldType.uint, 0, 4)
  animationTargetId!: number

  @field(FieldType.uint, 8, 4)
  action!: number

  @field(FieldType.uint, 12, 4)
  sequence!: number

  @field(FieldType.float, 16, 4)
  animationLockTime!: number

  @field(FieldType.uint, 20, 4)
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
  effectDisplayType!: number

  @field(FieldType.byte, 33)
  effectCount!: number
}
