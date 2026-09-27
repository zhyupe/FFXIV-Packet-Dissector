import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field } from '@/struct/struct.decorator'

export class RecastGroup extends Struct {
  static byteLength = 640

  @field(FieldType.array, 0, 320)
  @child({ type: FieldType.float, byteLength: 4 })
  elapsed!: number[]

  @field(FieldType.array, 320, 320)
  @child({ type: FieldType.float, byteLength: 4 })
  total!: number[]
}
export class UpdateDutyRecastTimes extends Struct {
  @field(FieldType.array, 0, 8)
  @child({ type: FieldType.float, byteLength: 4 })
  elapsed!: number[]

  @field(FieldType.array, 8, 8)
  @child({ type: FieldType.float, byteLength: 4 })
  total!: number[]
}
export class UpdateDutyRecastTimes5 extends Struct {
  @field(FieldType.array, 0, 20)
  @child({ type: FieldType.float, byteLength: 4 })
  elapsed!: number[]

  @field(FieldType.array, 20, 20)
  @child({ type: FieldType.float, byteLength: 4 })
  total!: number[]
}
