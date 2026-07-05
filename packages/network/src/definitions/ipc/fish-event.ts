import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format, ipcEnum } from '@/struct/struct.decorator'

const FishEventType = {
  Cast: 1,
  Hook: 2,
  Finish: 3,
  Bite: 5,
} as const

@ipcEnum('FishEventType', FishEventType)
export class FishEvent extends Struct {
  @field(FieldType.uint, 0, 4)
  @format({ base: Base.HEX })
  userId!: number

  @field(FieldType.uint, 4, 2)
  unknown1!: number

  @field(FieldType.uint, 6, 2)
  unknown2!: number

  @field(FieldType.uint, 8, 2)
  unknown3!: number

  @field(FieldType.uint, 10, 2)
  unknown4!: number

  @field(FieldType.uint, 12, 2)
  @format({ enum: 'FishEventType', append: 'enum' })
  type!: number

  @field(FieldType.uint, 14, 2)
  unknown5!: number

  @field(FieldType.uint, 16, 2)
  unknown7!: number

  @field(FieldType.uint, 18, 2)
  unknown8!: number

  @field(FieldType.uint, 20, 2)
  unknown9!: number

  @field(FieldType.uint, 22, 2)
  unknown10!: number

  @field(FieldType.uint, 24, 2)
  unknown11!: number

  @field(FieldType.uint, 26, 2)
  unknown12!: number

  @field(FieldType.uint, 28, 2)
  biteType!: number

  @field(FieldType.uint, 30, 2)
  unknown14!: number

  @field(FieldType.uint, 32, 2)
  unknown15!: number

  @field(FieldType.uint, 34, 2)
  unknown16!: number
}
