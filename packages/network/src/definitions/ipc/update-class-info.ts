import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field, format } from '@/struct/struct.decorator'

export class UpdateClassInfo extends Struct {
  @field(FieldType.byte, 0)
  @format({ db: 'ClassJob', append: 'enum' })
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

export class UpdateClassInfoEureka extends Struct {
  @field(FieldType.byte, 0)
  rank!: number

  @field(FieldType.byte, 1)
  element!: number

  @field(FieldType.byte, 2)
  unknown2!: number

  @field(FieldType.byte, 3)
  padding!: number

  @field(FieldType.object, 4, 16)
  @child(UpdateClassInfo)
  data!: UpdateClassInfo
}
export class UpdateClassInfoBozja extends Struct {
  @field(FieldType.byte, 0)
  rank!: number

  @field(FieldType.byte, 1)
  unknown1!: number

  @field(FieldType.byte, 2)
  unknown2!: number

  @field(FieldType.byte, 3)
  padding!: number

  @field(FieldType.object, 4, 16)
  @child(UpdateClassInfo)
  data!: UpdateClassInfo
}
export class UpdateClassInfoOccult extends Struct {
  @field(FieldType.byte, 0)
  rank!: number

  @field(FieldType.byte, 1)
  unknown1!: number

  @field(FieldType.byte, 2)
  unknown2!: number

  @field(FieldType.byte, 3)
  padding!: number

  @field(FieldType.object, 4, 16)
  @child(UpdateClassInfo)
  data!: UpdateClassInfo
}
