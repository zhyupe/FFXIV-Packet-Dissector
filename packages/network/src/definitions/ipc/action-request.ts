import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class ActionRequest extends Struct {
  static byteLength = 40

  @field(FieldType.byte, 0)
  actionProcState!: number

  @field(FieldType.byte, 1)
  actionType!: number

  @field(FieldType.uint, 2, 2)
  unknown1!: number

  @field(FieldType.uint, 4, 4)
  actionId!: number

  @field(FieldType.uint, 8, 2)
  sequence!: number

  @field(FieldType.uint, 10, 2)
  rotation!: number

  @field(FieldType.uint, 12, 2)
  directionToTarget!: number

  @field(FieldType.uint, 14, 2)
  unknown2!: number

  @field(FieldType.biguint, 16)
  targetId!: bigint

  @field(FieldType.uint, 24, 2)
  itemSourceSlot!: number

  @field(FieldType.uint, 26, 2)
  itemSourceContainer!: number

  @field(FieldType.uint, 28, 4)
  unknown3!: number

  @field(FieldType.biguint, 32)
  unknown4!: bigint
}
export class ActionRequestGroundTargeted extends Struct {
  static byteLength = 40

  @field(FieldType.byte, 0)
  actionProcState!: number

  @field(FieldType.byte, 1)
  actionType!: number

  @field(FieldType.uint, 2, 2)
  unknown1!: number

  @field(FieldType.uint, 4, 4)
  actionId!: number

  @field(FieldType.uint, 8, 2)
  sequence!: number

  @field(FieldType.uint, 10, 2)
  rotation!: number

  @field(FieldType.uint, 12, 2)
  directionToTarget!: number

  @field(FieldType.uint, 14, 2)
  unknown2!: number

  @field(FieldType.float, 16)
  x!: number

  @field(FieldType.float, 20)
  y!: number

  @field(FieldType.float, 24)
  z!: number

  @field(FieldType.uint, 28, 4)
  unknown3!: number

  @field(FieldType.biguint, 32)
  unknown4!: bigint
}
