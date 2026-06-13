import { Struct } from '@/struct/struct'
import { field, child } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'
import { Position } from './common/position'

export class InitZone extends Struct {
  @field(FieldType.uint, 0, 2)
  serverId!: number

  @field(FieldType.uint, 2, 2)
  zoneId!: number

  @field(FieldType.uint, 4, 2)
  unknown1!: number

  @field(FieldType.uint, 6, 2)
  Content!: number

  @field(FieldType.uint, 8, 4)
  unknown3!: number

  @field(FieldType.uint, 12, 4)
  unknown4!: number

  @field(FieldType.byte, 16)
  weatherId!: number

  @field(FieldType.byte, 17)
  bitmask!: number

  @field(FieldType.byte, 18)
  bitmask1!: number

  @field(FieldType.byte, 19)
  unknown5!: number

  @field(FieldType.uint, 20, 4)
  unknown8!: number

  @field(FieldType.uint, 24, 2)
  festivalId!: number

  @field(FieldType.uint, 26, 2)
  additionalFestivalId!: number

  @field(FieldType.uint, 28, 4)
  unknown9!: number

  @field(FieldType.uint, 32, 4)
  unknown10!: number

  @field(FieldType.uint, 36, 4)
  unknown11!: number

  @field(FieldType.uint, 40, 4)
  unknown120!: number

  @field(FieldType.uint, 44, 4)
  unknown121!: number

  @field(FieldType.uint, 48, 4)
  unknown122!: number

  @field(FieldType.uint, 52, 4)
  unknown123!: number

  @field(FieldType.uint, 56, 4)
  unknown130!: number

  @field(FieldType.uint, 60, 4)
  unknown131!: number

  @field(FieldType.uint, 64, 4)
  unknown132!: number

  @field(FieldType.object, 68, 12)
  @child(Position)
  position!: Position

  @field(FieldType.uint, 80, 4)
  unknown140!: number

  @field(FieldType.uint, 84, 4)
  unknown141!: number

  @field(FieldType.uint, 88, 4)
  unknown142!: number

  @field(FieldType.uint, 92, 4)
  unknown15!: number
}
