import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { dissector, field } from '@/struct/struct.decorator'

export class UpdateClassInfo extends Struct {
  @field(FieldType.byte, 0)
  @dissector({ db: 'ClassJob' })
  classId!: number

  @field(FieldType.byte, 1)
  level1!: number

  @field(FieldType.uint, 2, 2)
  level!: number

  @field(FieldType.uint, 4, 4)
  nextLevelIndex!: number

  @field(FieldType.uint, 8, 4)
  currentExp!: number

  @field(FieldType.uint, 12, 4)
  restedExp!: number
}
