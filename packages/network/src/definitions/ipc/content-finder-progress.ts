import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class ContentFinderProgress extends Struct {
  @field(FieldType.uint, 0, 4)
  unknown1!: number

  @field(FieldType.uint, 4, 2)
  unknown2!: number

  @field(FieldType.byte, 6)
  waitOrder!: number

  @field(FieldType.byte, 7)
  waitTime!: number

  @field(FieldType.byte, 8)
  currentTank!: number

  @field(FieldType.byte, 9)
  requireTank!: number

  @field(FieldType.byte, 10)
  currentHealth!: number

  @field(FieldType.byte, 11)
  requireHealth!: number

  @field(FieldType.byte, 12)
  currentDps!: number

  @field(FieldType.byte, 13)
  requireDps!: number

  @field(FieldType.uint, 14, 2)
  unknown4!: number
}
