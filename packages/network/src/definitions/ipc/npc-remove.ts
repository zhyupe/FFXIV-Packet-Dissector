import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format } from '@/struct/struct.decorator'

export class NpcRemove extends Struct {
  @field(FieldType.uint, 0, 4)
  unknown!: number

  @field(FieldType.uint, 4, 4)
  @format({ base: Base.HEX })
  npcId!: number
}
