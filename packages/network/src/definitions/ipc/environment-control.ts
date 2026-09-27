import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field } from '@/struct/struct.decorator'

export class EnvironmentControl extends Struct {
  static byteLength = 16

  @field(FieldType.uint, 0, 4)
  eventId!: number

  @field(FieldType.uint, 4, 2)
  state!: number

  @field(FieldType.uint, 6, 2)
  timelineIndex!: number

  @field(FieldType.byte, 8)
  index!: number

  @field(FieldType.bytes, 9, 7)
  unknown!: Buffer
}
export class MapEffect4 extends Struct {
  static byteLength = 24

  @field(FieldType.byte, 0)
  count!: number

  @field(FieldType.byte, 1)
  unknown!: number

  @field(FieldType.array, 2, 8)
  @child({ type: FieldType.uint, byteLength: 2 })
  states!: number[]

  @field(FieldType.array, 10, 8)
  @child({ type: FieldType.uint, byteLength: 2 })
  flags!: number[]

  @field(FieldType.array, 18, 4)
  @child({ type: FieldType.byte, byteLength: 1 })
  indices!: number[]
}
export class MapEffect8 extends Struct {
  static byteLength = 48

  @field(FieldType.byte, 0)
  count!: number

  @field(FieldType.byte, 1)
  unknown!: number

  @field(FieldType.array, 2, 16)
  @child({ type: FieldType.uint, byteLength: 2 })
  states!: number[]

  @field(FieldType.array, 18, 16)
  @child({ type: FieldType.uint, byteLength: 2 })
  flags!: number[]

  @field(FieldType.array, 34, 8)
  @child({ type: FieldType.byte, byteLength: 1 })
  indices!: number[]
}
export class MapEffect12 extends Struct {
  static byteLength = 64

  @field(FieldType.byte, 0)
  count!: number

  @field(FieldType.byte, 1)
  unknown!: number

  @field(FieldType.array, 2, 24)
  @child({ type: FieldType.uint, byteLength: 2 })
  states!: number[]

  @field(FieldType.array, 26, 24)
  @child({ type: FieldType.uint, byteLength: 2 })
  flags!: number[]

  @field(FieldType.array, 50, 12)
  @child({ type: FieldType.byte, byteLength: 1 })
  indices!: number[]
}
