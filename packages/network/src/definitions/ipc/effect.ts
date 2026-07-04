import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, dissector, field } from '@/struct/struct.decorator'
import { EffectEntity } from './common/effect-entity'
import { EffectHeader } from './common/effect-header'

export class Effect extends Struct {
  @field(FieldType.object, 0, EffectHeader.byteLength)
  @child(EffectHeader)
  header!: EffectHeader

  @field(FieldType.array, 42, 8 * EffectEntity.byteLength)
  @child(EffectEntity)
  entities!: EffectEntity[]

  @field(FieldType.uint, 112, 4)
  @dissector({ base: 'hex' })
  effectTargetId!: number

  @field(FieldType.uint, 116, 4)
  effectFlags!: number
}
