import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field, format } from '@/struct/struct.decorator'

export class AddStatusEffectItem extends Struct {
  @field(FieldType.uint, 0, 2)
  @format({ db: 'Status', append: 'enum' })
  status!: number

  @field(FieldType.uint, 2, 2)
  statusExtra!: number

  @field(FieldType.uint, 4, 2)
  unknown1!: number

  @field(FieldType.float, 6)
  duration!: number

  @field(FieldType.uint, 10, 4)
  @format({ base: Base.HEX })
  actorId!: number

  @field(FieldType.uint, 14, 2)
  unknown2!: number
}

export class EffectResult extends Struct {
  @field(FieldType.uint, 0, 4)
  lastBuffPacketId!: number

  @field(FieldType.uint, 4, 4)
  userId!: number

  @field(FieldType.uint, 8, 4)
  currentHp!: number

  @field(FieldType.uint, 12, 4)
  maxHp!: number

  @field(FieldType.uint, 16, 2)
  currentMp!: number

  @field(FieldType.uint, 18, 2)
  currentTp!: number

  @field(FieldType.byte, 20)
  damageShield!: number

  @field(FieldType.byte, 21)
  count!: number

  @field(FieldType.byte, 22)
  unknown3!: number

  @field(FieldType.uint, 24, 2)
  unknown4!: number

  @field(FieldType.object, 26, AddStatusEffectItem.byteLength)
  @child(AddStatusEffectItem)
  addStatusEffectItem!: AddStatusEffectItem
}
