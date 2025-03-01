import { Struct, StructConstructor } from '@/struct/struct'
import { field, child } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'
import { EffectHeader } from './common/effect-header'
import { EffectEntity } from './common/effect-entity'

export abstract class AoeEffect extends Struct {
  header!: EffectHeader
  entities!: EffectEntity[]
  effectTargetIds!: Buffer[]
  effectFlags!: Buffer
}

function AoeEffectFactory(target: number): StructConstructor<AoeEffect> {
  const entitiesLength = target * 8 * EffectEntity.byteLength
  const struct = class extends Struct {
    header!: EffectHeader
    entities!: EffectEntity[]
    effectTargetIds!: Buffer[]
    effectFlags!: Buffer
  }

  field(FieldType.object, 0, 42)(struct.prototype, 'header')
  child(EffectHeader)(struct.prototype, 'header')

  field(FieldType.array, 42, entitiesLength)(struct.prototype, 'entities')
  child(EffectEntity)(struct.prototype, 'entities')

  field(
    FieldType.array,
    42 + entitiesLength + 6,
    target * 8,
  )(struct.prototype, 'effectTargetIds')
  child({ type: FieldType.bytes, byteLength: 8 })(
    struct.prototype,
    'effectTargetIds',
  )

  field(
    FieldType.bytes,
    42 + entitiesLength + 6 + target * 8,
    8,
  )(struct.prototype, 'effectFlags')

  return struct
}

export const AoeEffect8 = AoeEffectFactory(8)
export const AoeEffect16 = AoeEffectFactory(16)
export const AoeEffect24 = AoeEffectFactory(24)
export const AoeEffect32 = AoeEffectFactory(32)
