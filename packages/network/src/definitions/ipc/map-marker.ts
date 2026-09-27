import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field } from '@/struct/struct.decorator'

export class MapMarker2 extends Struct {
  @field(FieldType.byte, 0)
  count!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 8)
  @child({ type: FieldType.uint, byteLength: 4 })
  iconIds!: number[]

  @field(FieldType.array, 12, 8)
  @child({ type: FieldType.uint, byteLength: 4 })
  layoutIds!: number[]

  @field(FieldType.array, 20, 8)
  @child({ type: FieldType.uint, byteLength: 4 })
  handlerIds!: number[]

  @field(FieldType.array, 28, 2)
  @child({ type: FieldType.byte, byteLength: 1 })
  types!: number[]
}
export class MapMarker4 extends Struct {
  @field(FieldType.byte, 0)
  count!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 16)
  @child({ type: FieldType.uint, byteLength: 4 })
  iconIds!: number[]

  @field(FieldType.array, 20, 16)
  @child({ type: FieldType.uint, byteLength: 4 })
  layoutIds!: number[]

  @field(FieldType.array, 36, 16)
  @child({ type: FieldType.uint, byteLength: 4 })
  handlerIds!: number[]

  @field(FieldType.array, 52, 4)
  @child({ type: FieldType.byte, byteLength: 1 })
  types!: number[]
}
export class MapMarker8 extends Struct {
  @field(FieldType.byte, 0)
  count!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 32)
  @child({ type: FieldType.uint, byteLength: 4 })
  iconIds!: number[]

  @field(FieldType.array, 36, 32)
  @child({ type: FieldType.uint, byteLength: 4 })
  layoutIds!: number[]

  @field(FieldType.array, 68, 32)
  @child({ type: FieldType.uint, byteLength: 4 })
  handlerIds!: number[]

  @field(FieldType.array, 100, 8)
  @child({ type: FieldType.byte, byteLength: 1 })
  types!: number[]
}
export class MapMarker16 extends Struct {
  @field(FieldType.byte, 0)
  count!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 64)
  @child({ type: FieldType.uint, byteLength: 4 })
  iconIds!: number[]

  @field(FieldType.array, 68, 64)
  @child({ type: FieldType.uint, byteLength: 4 })
  layoutIds!: number[]

  @field(FieldType.array, 132, 64)
  @child({ type: FieldType.uint, byteLength: 4 })
  handlerIds!: number[]

  @field(FieldType.array, 196, 16)
  @child({ type: FieldType.byte, byteLength: 1 })
  types!: number[]
}
export class MapMarker32 extends Struct {
  @field(FieldType.byte, 0)
  count!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 128)
  @child({ type: FieldType.uint, byteLength: 4 })
  iconIds!: number[]

  @field(FieldType.array, 132, 128)
  @child({ type: FieldType.uint, byteLength: 4 })
  layoutIds!: number[]

  @field(FieldType.array, 260, 128)
  @child({ type: FieldType.uint, byteLength: 4 })
  handlerIds!: number[]

  @field(FieldType.array, 388, 32)
  @child({ type: FieldType.byte, byteLength: 1 })
  types!: number[]
}
export class MapMarker64 extends Struct {
  @field(FieldType.byte, 0)
  count!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 256)
  @child({ type: FieldType.uint, byteLength: 4 })
  iconIds!: number[]

  @field(FieldType.array, 260, 256)
  @child({ type: FieldType.uint, byteLength: 4 })
  layoutIds!: number[]

  @field(FieldType.array, 516, 256)
  @child({ type: FieldType.uint, byteLength: 4 })
  handlerIds!: number[]

  @field(FieldType.array, 772, 64)
  @child({ type: FieldType.byte, byteLength: 1 })
  types!: number[]
}
export class MapMarker128 extends Struct {
  @field(FieldType.byte, 0)
  count!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 512)
  @child({ type: FieldType.uint, byteLength: 4 })
  iconIds!: number[]

  @field(FieldType.array, 516, 512)
  @child({ type: FieldType.uint, byteLength: 4 })
  layoutIds!: number[]

  @field(FieldType.array, 1028, 512)
  @child({ type: FieldType.uint, byteLength: 4 })
  handlerIds!: number[]

  @field(FieldType.array, 1540, 128)
  @child({ type: FieldType.byte, byteLength: 1 })
  types!: number[]
}
