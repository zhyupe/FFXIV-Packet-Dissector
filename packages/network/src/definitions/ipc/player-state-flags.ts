import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class PlayerStateFlags extends Struct {
  @field(FieldType.byte, 0)
  flags0!: number

  @field(FieldType.byte, 1)
  flags1!: number

  @field(FieldType.byte, 2)
  flags2!: number

  @field(FieldType.byte, 3)
  flags3!: number

  @field(FieldType.byte, 4)
  flags4!: number

  @field(FieldType.byte, 5)
  flags5!: number

  @field(FieldType.byte, 6)
  flags6!: number

  @field(FieldType.byte, 7)
  flags7!: number

  @field(FieldType.byte, 8)
  flags8!: number

  @field(FieldType.byte, 9)
  flags9!: number

  @field(FieldType.byte, 10)
  flags10!: number

  @field(FieldType.byte, 11)
  flags11!: number

  @field(FieldType.uint, 12, 4)
  padding!: number
}
