import { Struct } from '@/struct/struct'
import { field, child } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'
import { StatusEffect } from './status-effect'
import { Position } from './position'

export class Character extends Struct {
  @field(FieldType.uint, 0, 2)
  title!: number

  @field(FieldType.uint, 4, 2)
  currentWorldId!: number

  @field(FieldType.uint, 6, 2)
  homeWorldId!: number

  @field(FieldType.byte, 8)
  gmRank!: number

  @field(FieldType.byte, 11)
  onlineStatus!: number

  @field(FieldType.byte, 12)
  pose!: number

  @field(FieldType.bytes, 16, 8)
  targetId!: Buffer

  @field(FieldType.bytes, 32, 8)
  mainWeaponModel!: Buffer

  @field(FieldType.bytes, 40, 8)
  secWeaponModel!: Buffer

  @field(FieldType.bytes, 48, 8)
  craftToolModel!: Buffer

  @field(FieldType.uint, 64, 4)
  bNPCBase!: number

  @field(FieldType.uint, 68, 4)
  bNPCName!: number

  @field(FieldType.uint, 72, 4)
  levelId!: number

  @field(FieldType.uint, 80, 4)
  directorId!: number

  @field(FieldType.uint, 84, 4)
  ownerId!: number

  @field(FieldType.uint, 88, 4)
  parentActorId!: number

  @field(FieldType.uint, 92, 4)
  hpMax!: number

  @field(FieldType.uint, 96, 4)
  hpCur!: number

  @field(FieldType.uint, 100, 4)
  displayFlags!: number

  @field(FieldType.uint, 104, 2)
  fateID!: number

  @field(FieldType.uint, 106, 2)
  mpCur!: number

  @field(FieldType.uint, 108, 2)
  tpCur!: number

  @field(FieldType.uint, 110, 2)
  mpMax!: number

  @field(FieldType.uint, 112, 2)
  modelChara!: number

  @field(FieldType.uint, 114, 2)
  rotation!: number

  @field(FieldType.uint, 116, 2)
  activeMinion!: number

  @field(FieldType.byte, 118)
  spawnIndex!: number

  @field(FieldType.byte, 119)
  state!: number

  @field(FieldType.byte, 120)
  persistentEmote!: number

  @field(FieldType.byte, 121)
  modelType!: number

  @field(FieldType.byte, 122)
  subtype!: number

  @field(FieldType.byte, 123)
  voice!: number

  @field(FieldType.byte, 126)
  enemyType!: number

  @field(FieldType.byte, 127)
  level!: number

  @field(FieldType.byte, 128)
  classJob!: number

  @field(FieldType.byte, 132)
  currentMount!: number

  @field(FieldType.byte, 133)
  mountHead!: number

  @field(FieldType.byte, 134)
  mountBody!: number

  @field(FieldType.byte, 135)
  mountFeet!: number

  @field(FieldType.byte, 136)
  mountColor!: number

  @field(FieldType.byte, 137)
  scale!: number

  @field(FieldType.uint, 138, 2)
  elementalLevel!: number

  @field(FieldType.uint, 140, 2)
  element!: number

  @field(FieldType.array, 144, 30 * StatusEffect.byteLength)
  @child(StatusEffect)
  statusEffects!: StatusEffect

  @field(FieldType.object, 504, 12)
  @child(Position)
  position!: Position

  @field(FieldType.array, 516, 40)
  @child({ type: FieldType.int, byteLength: 4 })
  models!: number[]

  @field(FieldType.string, 556, 32)
  nickname!: string

  @field(FieldType.bytes, 588, 26)
  look!: Buffer

  @field(FieldType.string, 614, 10)
  fcTag!: string
}
