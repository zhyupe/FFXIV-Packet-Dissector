import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { dissector, field } from '@/struct/struct.decorator'

export class ContentFinderTriggerRouttle extends Struct {
  @field(FieldType.uint, 0, 2)
  @dissector({ db: 'ContentRoulette' })
  roulette!: number

  @field(FieldType.uint, 2, 2)
  unknown1!: number

  @field(FieldType.uint, 4, 2)
  flags!: number

  @field(FieldType.uint, 6, 2)
  unknown2!: number

  @field(FieldType.uint, 8, 4)
  unknown3!: number

  @field(FieldType.uint, 12, 4)
  unknown4!: number
}
