import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { dissector, field } from '@/struct/struct.decorator'

export class CEDirector extends Struct {
  @field(FieldType.uint, 0, 4)
  timeStart!: number

  @field(FieldType.uint, 4, 4)
  timeRemaining!: number

  @field(FieldType.byte, 8)
  @dissector({ db: 'DynamicEvent', append: 'enum' })
  event!: number

  @field(FieldType.byte, 9)
  players!: number

  @field(FieldType.uint, 10, 2)
  status!: number

  @field(FieldType.uint, 12, 4)
  progress!: number
}
