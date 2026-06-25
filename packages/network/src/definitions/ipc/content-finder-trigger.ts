import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { dissector, field } from '@/struct/struct.decorator'

export class ContentFinderTrigger extends Struct {
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

  @field(FieldType.uint, 12, 2)
  unknown4!: number

  @field(FieldType.uint, 14, 2)
  @dissector({ db: 'ContentFinderCondition' })
  content1!: number

  @field(FieldType.uint, 16, 2)
  @dissector({ db: 'ContentFinderCondition' })
  content2!: number

  @field(FieldType.uint, 18, 2)
  @dissector({ db: 'ContentFinderCondition' })
  content3!: number

  @field(FieldType.uint, 20, 2)
  @dissector({ db: 'ContentFinderCondition' })
  content4!: number

  @field(FieldType.uint, 22, 2)
  @dissector({ db: 'ContentFinderCondition' })
  content5!: number
}
