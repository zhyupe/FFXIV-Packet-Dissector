import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class FirstAttack extends Struct {
  static byteLength = 16

  @field(FieldType.byte, 0)
  type!: number

  @field(FieldType.bytes, 1, 7)
  unknown!: Buffer

  @field(FieldType.biguint, 8)
  actorId!: bigint
}
export class DeleteObject extends Struct {
  @field(FieldType.byte, 0)
  index!: number

  @field(FieldType.bytes, 1)
  unknown!: Buffer
}
export class ChangeClass extends Struct {
  @field(FieldType.byte, 0)
  classId!: number

  @field(FieldType.byte, 1)
  unknown1!: number

  @field(FieldType.byte, 2)
  unknown2!: number

  @field(FieldType.byte, 3)
  unknown3!: number

  @field(FieldType.uint, 4, 2)
  level!: number

  @field(FieldType.uint, 6, 2)
  classLevel!: number
}
