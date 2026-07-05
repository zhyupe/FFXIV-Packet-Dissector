import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format } from '@/struct/struct.decorator'

export class SkillHandler extends Struct {
  @field(FieldType.byte, 0)
  pad_0000!: number

  @field(FieldType.byte, 1)
  type!: number

  @field(FieldType.byte, 2)
  pad_00020!: number

  @field(FieldType.byte, 3)
  pad_00021!: number

  @field(FieldType.uint, 4, 4)
  @format({ db: 'Action' })
  action!: number

  @field(FieldType.uint, 8, 2)
  sequence!: number

  @field(FieldType.byte, 10)
  pad_000C0!: number

  @field(FieldType.byte, 11)
  pad_000C1!: number

  @field(FieldType.byte, 12)
  pad_000C2!: number

  @field(FieldType.byte, 13)
  pad_000C3!: number

  @field(FieldType.byte, 14)
  pad_000C4!: number

  @field(FieldType.byte, 15)
  pad_000C5!: number

  @field(FieldType.uint, 16, 4)
  @format({ base: Base.HEX })
  targetId!: number

  @field(FieldType.uint, 20, 4)
  unknown1!: number

  @field(FieldType.uint, 24, 2)
  itemSourceSlot!: number

  @field(FieldType.uint, 26, 2)
  itemSourceContainer!: number

  @field(FieldType.uint, 28, 4)
  unknown!: number
}
