import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format, ipcEnum } from '@/struct/struct.decorator'

@ipcEnum('ActorCastSkillType', {
  Normal: 1,
  ItemAction: 2,
  MountSkill: 13,
})
export class ActorCast extends Struct {
  @field(FieldType.uint, 0, 2)
  @format({ db: 'Action' })
  action!: number

  @field(FieldType.byte, 2)
  @format({ enum: 'ActorCastSkillType' })
  skillType!: number

  @field(FieldType.uint, 4, 4)
  @format({ db: 'Item' })
  itemId!: number

  @field(FieldType.float, 8)
  castTime!: number

  @field(FieldType.uint, 12, 4)
  @format({ base: Base.HEX })
  targetId!: number

  @field(FieldType.float, 16)
  rotation!: number

  @field(FieldType.uint, 24, 2)
  x!: number

  @field(FieldType.uint, 26, 2)
  y!: number

  @field(FieldType.uint, 28, 2)
  z!: number
}
