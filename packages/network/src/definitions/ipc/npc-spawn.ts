import { Character } from './common/character'

export class NpcSpawn extends Character {
  // @field(FieldType.uint, 0, 4)
  // gimmickId!: number
  // @field(FieldType.byte, 6)
  // gmRank!: number
  // @field(FieldType.byte, 8)
  // aggressionMode!: number
  // @field(FieldType.byte, 9)
  // onlineStatus!: number
  // @field(FieldType.byte, 11)
  // pose!: number
  // @field(FieldType.byte, 632)
  // bNPCPartSlot!: number
}

export class NpcSpawn2 extends NpcSpawn {
  // @field(FieldType.byte, ?)
  // statusEffects2!: number
}
