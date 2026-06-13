import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'

export class PlayerStats extends Struct {
  @field(FieldType.uint, 0, 4)
  strength!: number

  @field(FieldType.uint, 4, 4)
  dexterity!: number

  @field(FieldType.uint, 8, 4)
  vitality!: number

  @field(FieldType.uint, 12, 4)
  intelligence!: number

  @field(FieldType.uint, 16, 4)
  mind!: number

  @field(FieldType.uint, 20, 4)
  piety!: number

  @field(FieldType.uint, 24, 4)
  hp!: number

  @field(FieldType.uint, 28, 4)
  mp!: number

  @field(FieldType.uint, 32, 4)
  tp!: number

  @field(FieldType.uint, 36, 4)
  gp!: number

  @field(FieldType.uint, 40, 4)
  cp!: number

  @field(FieldType.uint, 44, 4)
  delay!: number

  @field(FieldType.uint, 48, 4)
  tenacity!: number

  @field(FieldType.uint, 52, 4)
  attackPower!: number

  @field(FieldType.uint, 56, 4)
  defense!: number

  @field(FieldType.uint, 60, 4)
  directHitRate!: number

  @field(FieldType.uint, 64, 4)
  evasion!: number

  @field(FieldType.uint, 68, 4)
  magicDefense!: number

  @field(FieldType.uint, 72, 4)
  criticalHit!: number

  @field(FieldType.uint, 76, 4)
  attackMagicPotency!: number

  @field(FieldType.uint, 80, 4)
  healingMagicPotency!: number

  @field(FieldType.uint, 84, 4)
  elementalBonus!: number

  @field(FieldType.uint, 88, 4)
  determination!: number

  @field(FieldType.uint, 92, 4)
  skillSpeed!: number

  @field(FieldType.uint, 96, 4)
  spellSpeed!: number

  @field(FieldType.uint, 100, 4)
  haste!: number

  @field(FieldType.uint, 104, 4)
  craftsmanship!: number

  @field(FieldType.uint, 108, 4)
  control!: number

  @field(FieldType.uint, 112, 4)
  gathering!: number

  @field(FieldType.uint, 116, 4)
  perception!: number

  // @field(FieldType.uint, 120, 4)
  // unknown0!: number

  // @field(FieldType.uint, 124, 4)
  // unknown1!: number

  // @field(FieldType.uint, 128, 4)
  // unknown2!: number

  // @field(FieldType.uint, 132, 4)
  // unknown3!: number

  // @field(FieldType.uint, 136, 4)
  // unknown4!: number

  // @field(FieldType.uint, 140, 4)
  // unknown5!: number

  // @field(FieldType.uint, 144, 4)
  // unknown6!: number

  // @field(FieldType.uint, 148, 4)
  // unknown7!: number

  // @field(FieldType.uint, 152, 4)
  // unknown8!: number

  // @field(FieldType.uint, 156, 4)
  // unknown9!: number

  // @field(FieldType.uint, 160, 4)
  // unknown10!: number

  // @field(FieldType.uint, 164, 4)
  // unknown11!: number

  // @field(FieldType.uint, 168, 4)
  // unknown12!: number

  // @field(FieldType.uint, 172, 4)
  // unknown13!: number

  // @field(FieldType.uint, 176, 4)
  // unknown14!: number

  // @field(FieldType.uint, 180, 4)
  // unknown15!: number

  // @field(FieldType.uint, 184, 4)
  // unknown16!: number

  // @field(FieldType.uint, 188, 4)
  // unknown17!: number

  // @field(FieldType.uint, 192, 4)
  // unknown18!: number

  // @field(FieldType.uint, 196, 4)
  // unknown19!: number

  // @field(FieldType.uint, 200, 4)
  // unknown20!: number

  // @field(FieldType.uint, 204, 4)
  // unknown21!: number

  // @field(FieldType.uint, 208, 4)
  // unknown22!: number

  // @field(FieldType.uint, 212, 4)
  // unknown23!: number

  // @field(FieldType.uint, 216, 4)
  // unknown24!: number

  // @field(FieldType.uint, 220, 4)
  // unknown25!: number
}
