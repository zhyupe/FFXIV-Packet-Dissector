import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, dissector, field } from '@/struct/struct.decorator'
import { EffectEntity } from './common/effect-entity'
import { EffectHeader } from './common/effect-header'

const targetIdLength = 8

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

export class Effect8 extends Struct {
  @field(FieldType.object, 0, EffectHeader.byteLength)
  @child(EffectHeader)
  header!: EffectHeader

  @field(FieldType.array, 42, 64 * EffectEntity.byteLength)
  @child(EffectEntity)
  entities!: EffectEntity[]

  @field(FieldType.array, 560, 8 * targetIdLength)
  @child({ type: FieldType.biguint, byteLength: targetIdLength })
  @dissector({ base: 'HEX' })
  effectTargetId!: bigint[]

  @field(FieldType.uint, 624, 4)
  effectFlags!: number

  @field(FieldType.uint, 628, 4)
  effectFlags2!: number
}

export class Effect16 extends Struct {
  @field(FieldType.object, 0, EffectHeader.byteLength)
  @child(EffectHeader)
  header!: EffectHeader

  @field(FieldType.array, 42, 128 * EffectEntity.byteLength)
  @child(EffectEntity)
  entities!: EffectEntity[]

  @field(FieldType.array, 1066, 16 * targetIdLength)
  @child({ type: FieldType.biguint, byteLength: targetIdLength })
  @dissector({ base: 'HEX' })
  effectTargetId!: bigint[]

  @field(FieldType.uint, 1200, 4)
  effectFlags!: number

  @field(FieldType.uint, 1204, 2)
  effectFlags2!: number
}

export class Effect24 extends Struct {
  @field(FieldType.object, 0, EffectHeader.byteLength)
  @child(EffectHeader)
  header!: EffectHeader

  @field(FieldType.array, 42, 192 * EffectEntity.byteLength)
  @child(EffectEntity)
  entities!: EffectEntity[]

  @field(FieldType.array, 1584, 24 * targetIdLength)
  @child({ type: FieldType.biguint, byteLength: targetIdLength })
  @dissector({ base: 'HEX' })
  effectTargetId!: bigint[]

  @field(FieldType.uint, 1776, 4)
  effectFlags!: number

  @field(FieldType.uint, 1780, 2)
  effectFlags2!: number
}

export class Effect32 extends Struct {
  @field(FieldType.object, 0, EffectHeader.byteLength)
  @child(EffectHeader)
  header!: EffectHeader

  @field(FieldType.array, 42, 256 * EffectEntity.byteLength)
  @child(EffectEntity)
  entities!: EffectEntity[]

  @field(FieldType.array, 2096, 32 * targetIdLength)
  @child({ type: FieldType.biguint, byteLength: targetIdLength })
  @dissector({ base: 'HEX' })
  effectTargetId!: bigint[]

  @field(FieldType.uint, 2352, 4)
  effectFlags!: number

  @field(FieldType.uint, 2356, 2)
  effectFlags2!: number
}
