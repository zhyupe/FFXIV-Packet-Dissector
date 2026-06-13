import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field } from '@/struct/struct.decorator'
import { EffectEntity } from './common/effect-entity'
import { EffectHeader } from './common/effect-header'

export class Effect extends Struct {
  @field(FieldType.object, 0, 42)
  @child(EffectHeader)
  header!: EffectHeader

  @field(FieldType.array, 42, 8 * EffectEntity.byteLength)
  @child(EffectEntity)
  entities!: EffectEntity[]

  @field(FieldType.uint, 112, 4)
  effectTargetId!: number

  @field(FieldType.uint, 116, 4)
  effectFlags!: number
}
