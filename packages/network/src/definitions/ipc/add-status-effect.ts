import { Struct } from '@/struct/struct'
import { field, child } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'
import { AddStatusEffectItem } from './common/add-status-effect-item'

export class AddStatusEffect extends Struct {
  @field(FieldType.uint, 0, 4)
  sequence!: number

  @field(FieldType.uint, 4, 4)
  actorId!: number

  @field(FieldType.uint, 8, 4)
  hpCur!: number

  @field(FieldType.uint, 12, 4)
  hpMax!: number

  @field(FieldType.uint, 16, 2)
  mpCur!: number

  @field(FieldType.uint, 18, 2)
  unknown1!: number

  @field(FieldType.byte, 20)
  damageShield!: number

  @field(FieldType.byte, 21)
  count!: number

  @field(FieldType.uint, 22, 2)
  unknown2!: number

  @field(FieldType.array, 24, 4 * AddStatusEffectItem.byteLength)
  @child(AddStatusEffectItem)
  statusEffects!: AddStatusEffectItem[]
}
