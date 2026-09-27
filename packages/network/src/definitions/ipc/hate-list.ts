import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field } from '@/struct/struct.decorator'

export class HateEntry extends Struct {
  static byteLength = 8

  @field(FieldType.uint, 0, 4)
  actorId!: number

  @field(FieldType.byte, 4)
  enmity!: number

  @field(FieldType.bytes, 5, 3)
  padding!: Buffer
}
export class HateList extends Struct {
  @field(FieldType.byte, 0)
  count!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 64)
  @child(HateEntry)
  entries!: HateEntry[]
}
export class HaterList extends Struct {
  @field(FieldType.byte, 0)
  count!: number

  @field(FieldType.bytes, 1, 3)
  padding!: Buffer

  @field(FieldType.array, 4, 256)
  @child(HateEntry)
  entries!: HateEntry[]
}
