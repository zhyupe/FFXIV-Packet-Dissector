import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class CountdownInitiate extends Struct {
  static byteLength = 64

  @field(FieldType.biguint, 0)
  senderContentId!: bigint

  @field(FieldType.biguint, 8)
  senderAccountId!: bigint

  @field(FieldType.uint, 16, 4)
  senderActorId!: number

  @field(FieldType.uint, 20, 2)
  worldId!: number

  @field(FieldType.uint, 22, 2)
  seconds!: number

  @field(FieldType.byte, 24)
  failedInCombat!: number

  @field(FieldType.byte, 25)
  unknown1!: number

  @field(FieldType.byte, 26)
  type!: number

  @field(FieldType.string, 27, 37)
  senderName!: string
}
export class CountdownCancel extends Struct {
  static byteLength = 56

  @field(FieldType.biguint, 0)
  senderContentId!: bigint

  @field(FieldType.biguint, 8)
  senderAccountId!: bigint

  @field(FieldType.uint, 16, 4)
  senderActorId!: number

  @field(FieldType.uint, 20, 2)
  worldId!: number

  @field(FieldType.uint, 22, 2)
  unknown!: number

  @field(FieldType.string, 24, 32)
  senderName!: string
}
