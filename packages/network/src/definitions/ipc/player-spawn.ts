import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field, format } from '@/struct/struct.decorator'
import { Position } from './common/position'
import { StatusEffect } from './common/status-effect'

export class PlayerSpawn extends Struct {
  static byteLength = 0x298

  @field(FieldType.biguint, 0x00)
  accountId!: bigint

  @field(FieldType.biguint, 0x08)
  contentId!: bigint

  @field(FieldType.uint, 0x10, 2)
  title!: number

  @field(FieldType.uint, 0x12, 2)
  timelineBaseOverride!: number

  @field(FieldType.uint, 0x14, 2)
  currentWorldId!: number

  @field(FieldType.uint, 0x16, 2)
  homeWorldId!: number

  @field(FieldType.byte, 0x18)
  gmRank!: number

  @field(FieldType.uint, 0x19, 2)
  unknown19!: number

  @field(FieldType.byte, 0x1b)
  onlineStatus!: number

  @field(FieldType.byte, 0x1c)
  pose!: number

  @field(FieldType.uint, 0x1d, 2)
  unknown1D!: number

  @field(FieldType.byte, 0x1f)
  unknown1F!: number

  @field(FieldType.bytes, 0x20, 8)
  targetId!: Buffer

  @field(FieldType.bytes, 0x28, 8)
  freeCompanyCrest!: Buffer

  @field(FieldType.bytes, 0x30, 8)
  mainWeaponModel!: Buffer

  @field(FieldType.bytes, 0x38, 8)
  secWeaponModel!: Buffer

  @field(FieldType.bytes, 0x40, 8)
  craftToolModel!: Buffer

  @field(FieldType.bytes, 0x48, 8)
  combatTaggerId!: Buffer

  @field(FieldType.uint, 0x50, 4)
  bNPCBase!: number

  @field(FieldType.uint, 0x54, 4)
  bNPCName!: number

  @field(FieldType.uint, 0x58, 4)
  levelId!: number

  @field(FieldType.uint, 0x5c, 4)
  objectType!: number

  @field(FieldType.uint, 0x60, 4)
  directorId!: number

  @field(FieldType.uint, 0x64, 4)
  ownerId!: number

  @field(FieldType.uint, 0x68, 4)
  tetherTargetId!: number

  @field(FieldType.uint, 0x6c, 4)
  hpMax!: number

  @field(FieldType.uint, 0x70, 4)
  hpCur!: number

  @field(FieldType.uint, 0x74, 4)
  displayFlags!: number

  @field(FieldType.uint, 0x78, 2)
  fateID!: number

  // MP, GP or CP, according to class/job.
  @field(FieldType.uint, 0x7a, 2)
  resourcePointsMax!: number

  @field(FieldType.uint, 0x7c, 2)
  resourcePoints!: number

  @field(FieldType.uint, 0x7e, 2)
  behavior!: number

  @field(FieldType.uint, 0x80, 2)
  modelChara!: number

  @field(FieldType.uint, 0x82, 2)
  rotation!: number

  @field(FieldType.uint, 0x84, 2)
  currentMount!: number

  @field(FieldType.uint, 0x86, 2)
  activeMinion!: number

  @field(FieldType.uint, 0x88, 2)
  followMountId!: number

  @field(FieldType.uint, 0x8a, 2)
  ornamentId!: number

  @field(FieldType.uint, 0x8c, 2)
  tetherId!: number

  @field(FieldType.byte, 0x8e)
  spawnIndex!: number

  @field(FieldType.byte, 0x8f)
  characterMode!: number

  @field(FieldType.byte, 0x90)
  modeParam!: number

  @field(FieldType.byte, 0x91)
  objectKind!: number

  @field(FieldType.byte, 0x92)
  subtype!: number

  @field(FieldType.byte, 0x93)
  voice!: number

  @field(FieldType.byte, 0x94)
  freeCompanyCrestFlags!: number

  @field(FieldType.byte, 0x95)
  battalion!: number

  @field(FieldType.byte, 0x96)
  level!: number

  @field(FieldType.byte, 0x97)
  classJob!: number

  @field(FieldType.byte, 0x98)
  eventState!: number

  @field(FieldType.byte, 0x99)
  isHidden!: number

  @field(FieldType.byte, 0x9a)
  combatTagType!: number

  @field(FieldType.byte, 0x9b)
  mountHead!: number

  @field(FieldType.byte, 0x9c)
  mountBody!: number

  @field(FieldType.byte, 0x9d)
  mountFeet!: number

  @field(FieldType.byte, 0x9e)
  mountColor!: number

  @field(FieldType.byte, 0x9f)
  statusLoopVfxId!: number

  @field(FieldType.byte, 0xa0)
  forayRank!: number

  @field(FieldType.byte, 0xa1)
  forayElement!: number

  @field(FieldType.byte, 0xa2)
  modelScaleId!: number

  @field(FieldType.byte, 0xa3)
  modelState!: number

  @field(FieldType.byte, 0xa4)
  modelAttributeFlags!: number

  @field(FieldType.byte, 0xa5)
  animationState!: number

  @field(FieldType.bytes, 0xa6, 2)
  unknownA6!: Buffer

  @field(FieldType.array, 0xa8, 30 * StatusEffect.byteLength)
  @child(StatusEffect)
  statusEffects!: StatusEffect[]

  @field(FieldType.object, 0x210, 12)
  @child(Position)
  position!: Position

  @field(FieldType.array, 0x21c, 40)
  @child({ type: FieldType.uint, byteLength: 4 })
  models!: number[]

  @field(FieldType.array, 0x244, 10)
  @child({ type: FieldType.byte, byteLength: 1 })
  modelStain2Ids!: number[]

  @field(FieldType.array, 0x24e, 4)
  @child({ type: FieldType.uint, byteLength: 2 })
  glassesIds!: number[]

  @field(FieldType.string, 0x252, 32)
  @format({ append: 'val' })
  nickname!: string

  @field(FieldType.bytes, 0x272, 26)
  look!: Buffer

  @field(FieldType.string, 0x28c, 6)
  fcTag!: string

  @field(FieldType.bytes, 0x292, 6)
  unknownTail!: Buffer
}
