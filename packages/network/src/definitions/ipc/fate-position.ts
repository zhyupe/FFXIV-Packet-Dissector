import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format } from '@/struct/struct.decorator'

export class FatePosition extends Struct {
  @field(FieldType.uint, 0, 2)
  @format({ db: 'Fate', append: 'enum' })
  fate!: number

  @field(FieldType.uint, 2, 2)
  unknown0!: number

  @field(FieldType.uint, 4, 4)
  @format({ base: Base.HEX })
  npcId!: number

  @field(FieldType.uint, 8, 4)
  unknown1!: number

  @field(FieldType.int, 12, 4)
  @format({ append: 'val' })
  x!: number

  @field(FieldType.int, 16, 4)
  @format({ append: 'val' })
  y!: number

  @field(FieldType.int, 20, 4)
  @format({ append: 'val' })
  z!: number
}
