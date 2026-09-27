import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class NpcYell extends Struct {
  static byteLength = 32

  @field(FieldType.biguint, 0)
  sourceActorId!: bigint

  @field(FieldType.uint, 8, 4)
  unknown1!: number

  @field(FieldType.uint, 12, 2)
  messageId!: number

  @field(FieldType.uint, 14, 2)
  unknown2!: number

  @field(FieldType.biguint, 16)
  unknown3!: bigint

  @field(FieldType.biguint, 24)
  unknown4!: bigint
}
