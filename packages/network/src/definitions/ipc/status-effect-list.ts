import { Struct } from '@/struct/struct'
import { field, child } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'
import { StatusEffect } from './common/status-effect'

export class StatusEffectList extends Struct {
  @field(FieldType.byte, 0)
  classId!: number

  @field(FieldType.byte, 1)
  level1!: number

  @field(FieldType.byte, 2)
  level!: number

  @field(FieldType.byte, 3)
  level2!: number

  @field(FieldType.uint, 4, 4)
  hpCur!: number

  @field(FieldType.uint, 8, 4)
  hpMax!: number

  @field(FieldType.uint, 12, 2)
  mpCur!: number

  @field(FieldType.uint, 14, 2)
  mpMax!: number

  @field(FieldType.uint, 16, 2)
  unknown1!: number

  @field(FieldType.byte, 18)
  damageShield!: number

  @field(FieldType.byte, 19)
  unknown2!: number

  @field(FieldType.array, 20, 30 * StatusEffect.byteLength)
  @child(StatusEffect)
  statusEffects!: StatusEffect[]
}

export class BossStatusEffectList extends Struct {
  @field(FieldType.array, 0, 30 * StatusEffect.byteLength)
  @child(StatusEffect)
  statusEffects2!: StatusEffect[]

  @field(FieldType.byte, 360)
  classId!: number

  @field(FieldType.byte, 361)
  level1!: number

  @field(FieldType.uint, 362, 2)
  level!: number

  @field(FieldType.uint, 364, 4)
  hpCur!: number

  @field(FieldType.uint, 368, 4)
  hpMax!: number

  @field(FieldType.uint, 372, 2)
  mpCur!: number

  @field(FieldType.uint, 374, 2)
  mpMax!: number

  @field(FieldType.uint, 376, 2)
  tpCur!: number

  @field(FieldType.byte, 378)
  damageShield!: number

  // @field(FieldType.byte, 379)
  // unknown!: number

  @field(FieldType.array, 380, 30 * StatusEffect.byteLength)
  @child(StatusEffect)
  statusEffects!: StatusEffect[]
}
