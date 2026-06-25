import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { dissector, field } from '@/struct/struct.decorator'

export class GardenStatus extends Struct {
  @field(FieldType.byte, 0)
  @dissector({ append: 'val' })
  type!: number

  @field(FieldType.byte, 1)
  @dissector({ append: 'val' })
  houseIndex!: number

  @field(FieldType.uint, 2, 2)
  @dissector({ append: 'val' })
  section!: number

  @field(FieldType.uint, 8, 2)
  seed1!: number

  @field(FieldType.uint, 10, 2)
  seed2!: number

  @field(FieldType.uint, 12, 2)
  seed3!: number

  @field(FieldType.uint, 14, 2)
  seed4!: number

  @field(FieldType.uint, 16, 2)
  seed5!: number

  @field(FieldType.uint, 18, 2)
  seed6!: number

  @field(FieldType.uint, 20, 2)
  seed7!: number

  @field(FieldType.uint, 24, 2)
  seed8!: number

  @field(FieldType.byte, 26)
  status1!: number

  @field(FieldType.byte, 27)
  status2!: number

  @field(FieldType.byte, 28)
  status3!: number

  @field(FieldType.byte, 29)
  status4!: number

  @field(FieldType.byte, 30)
  status5!: number

  @field(FieldType.byte, 31)
  status6!: number

  @field(FieldType.byte, 32)
  status7!: number

  @field(FieldType.byte, 33)
  status8!: number
}
