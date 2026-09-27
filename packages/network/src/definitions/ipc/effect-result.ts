import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field, format } from '@/struct/struct.decorator'

export class EffectResultStatus extends Struct {
  static byteLength = 16

  @field(FieldType.byte, 0)
  index!: number

  @field(FieldType.byte, 1)
  unknown1!: number

  @field(FieldType.uint, 2, 2)
  @format({ db: 'Status', append: 'enum' })
  statusId!: number

  @field(FieldType.uint, 4, 2)
  param!: number

  @field(FieldType.uint, 6, 2)
  unknown2!: number

  @field(FieldType.float, 8)
  duration!: number

  @field(FieldType.uint, 12, 4)
  @format({ base: Base.HEX })
  sourceActorId!: number
}
export class EffectResultEntry extends Struct {
  static byteLength = 88

  @field(FieldType.uint, 0, 4)
  sequence!: number

  @field(FieldType.uint, 4, 4)
  @format({ base: Base.HEX })
  actorId!: number

  @field(FieldType.uint, 8, 4)
  currentHp!: number

  @field(FieldType.uint, 12, 4)
  maxHp!: number

  @field(FieldType.uint, 16, 2)
  currentMp!: number

  @field(FieldType.byte, 18)
  targetIndex!: number

  @field(FieldType.byte, 19)
  @format({ db: 'ClassJob' })
  classId!: number

  @field(FieldType.byte, 20)
  shieldPercentage!: number

  @field(FieldType.byte, 21)
  effectCount!: number

  @field(FieldType.uint, 22, 2)
  unknown!: number

  @field(FieldType.array, 24, 64)
  @child(EffectResultStatus)
  effects!: EffectResultStatus[]
}
export class EffectResultBasicEntry extends Struct {
  static byteLength = 16

  @field(FieldType.uint, 0, 4)
  sequence!: number

  @field(FieldType.uint, 4, 4)
  @format({ base: Base.HEX })
  actorId!: number

  @field(FieldType.uint, 8, 4)
  currentHp!: number

  @field(FieldType.byte, 12)
  targetIndex!: number

  @field(FieldType.bytes, 13, 3)
  unknown!: Buffer
}
export class EffectResult extends Struct {
  static byteLength = 96

  @field(FieldType.byte, 0)
  entryCount!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 88)
  @child(EffectResultEntry)
  entries!: EffectResultEntry[]
}
export class EffectResult4 extends Struct {
  static byteLength = 360

  @field(FieldType.byte, 0)
  entryCount!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 352)
  @child(EffectResultEntry)
  entries!: EffectResultEntry[]
}
export class EffectResult8 extends Struct {
  static byteLength = 712

  @field(FieldType.byte, 0)
  entryCount!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 704)
  @child(EffectResultEntry)
  entries!: EffectResultEntry[]
}
export class EffectResult16 extends Struct {
  static byteLength = 1416

  @field(FieldType.byte, 0)
  entryCount!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 1408)
  @child(EffectResultEntry)
  entries!: EffectResultEntry[]
}
export class EffectResultBasic extends Struct {
  static byteLength = 24

  @field(FieldType.byte, 0)
  entryCount!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 16)
  @child(EffectResultBasicEntry)
  entries!: EffectResultBasicEntry[]
}
export class EffectResultBasic4 extends Struct {
  static byteLength = 72

  @field(FieldType.byte, 0)
  entryCount!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 64)
  @child(EffectResultBasicEntry)
  entries!: EffectResultBasicEntry[]
}
export class EffectResultBasic8 extends Struct {
  static byteLength = 136

  @field(FieldType.byte, 0)
  entryCount!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 128)
  @child(EffectResultBasicEntry)
  entries!: EffectResultBasicEntry[]
}
export class EffectResultBasic16 extends Struct {
  static byteLength = 264

  @field(FieldType.byte, 0)
  entryCount!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 256)
  @child(EffectResultBasicEntry)
  entries!: EffectResultBasicEntry[]
}
export class EffectResultBasic32 extends Struct {
  static byteLength = 520

  @field(FieldType.byte, 0)
  entryCount!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 512)
  @child(EffectResultBasicEntry)
  entries!: EffectResultBasicEntry[]
}
export class EffectResultBasic64 extends Struct {
  static byteLength = 1032

  @field(FieldType.byte, 0)
  entryCount!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 1024)
  @child(EffectResultBasicEntry)
  entries!: EffectResultBasicEntry[]
}
export class AddStatusEffectItem extends EffectResultStatus {}
