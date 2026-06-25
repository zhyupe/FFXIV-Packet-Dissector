import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class TreasureShiftingWheelResult extends Struct {
  @field(FieldType.byte, 0)
  startPos!: number

  @field(FieldType.byte, 1)
  endPos!: number

  @field(FieldType.uint, 2, 2)
  unknownResult1!: number

  @field(FieldType.uint, 4, 4)
  unknownConstant1!: number

  @field(FieldType.uint, 8, 4)
  unknownConstant2!: number

  @field(FieldType.uint, 12, 4)
  unknownConstant3!: number

  @field(FieldType.uint, 16, 4)
  unknownConstant4!: number

  @field(FieldType.uint, 20, 4)
  unknownConstant5!: number

  @field(FieldType.uint, 24, 4)
  unknownLevel!: number

  @field(FieldType.byte, 28)
  extraMove!: number

  @field(FieldType.byte, 29)
  unknown1!: number

  @field(FieldType.uint, 30, 2)
  unknown2!: number

  @field(FieldType.uint, 32, 4)
  unknownConstant6!: number

  @field(FieldType.uint, 36, 4)
  unknownConstant7!: number

  @field(FieldType.uint, 40, 4)
  result!: number

  @field(FieldType.uint, 44, 4)
  unknownConstant8!: number

  @field(FieldType.uint, 48, 4)
  unknownConstant9!: number

  @field(FieldType.uint, 52, 4)
  finalLevel!: number
}
