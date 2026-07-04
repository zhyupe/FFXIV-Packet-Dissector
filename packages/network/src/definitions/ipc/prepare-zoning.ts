import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class PrepareZoning extends Struct {
  @field(FieldType.uint, 0, 4)
  logMessage!: number

  @field(FieldType.uint, 4, 2)
  targetZone!: number

  @field(FieldType.uint, 6, 2)
  animation!: number

  @field(FieldType.byte, 8)
  param4!: number

  @field(FieldType.byte, 9)
  hideChar!: number

  @field(FieldType.byte, 10)
  fadeOut!: number

  @field(FieldType.byte, 11)
  param7!: number

  @field(FieldType.byte, 12)
  fadeOutTime!: number

  @field(FieldType.byte, 13)
  unknown!: number

  @field(FieldType.uint, 14, 2)
  padding!: number
}
