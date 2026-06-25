import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, dissector, field, ipcIf } from '@/struct/struct.decorator'

@ipcIf('content')
export class ContentFinderNotifyInstance extends Struct {
  static byteLength = 4

  @field(FieldType.uint, 0, 2)
  @dissector({ db: 'ContentFinderCondition', append: 'enum' })
  content!: number

  @field(FieldType.uint, 2, 2)
  unknown!: number
}

export class ContentFinderNotify extends Struct {
  @field(FieldType.byte, 0)
  @dissector({ enum: 'MatchEventType' })
  type!: number

  @field(FieldType.byte, 1)
  @dissector({ db: 'ClassJob' })
  classJob!: number

  @field(FieldType.uint, 2, 2)
  unknown1!: number

  @field(FieldType.uint, 4, 2)
  unknown2!: number

  @field(FieldType.uint, 6, 2)
  unknown3!: number

  @field(FieldType.uint, 8, 2)
  @dissector({ db: 'ContentRoulette' })
  roulette!: number

  @field(FieldType.uint, 10, 2)
  unknown5!: number

  @field(FieldType.array, 12, 5 * ContentFinderNotifyInstance.byteLength)
  @child(ContentFinderNotifyInstance)
  contentFinderNotifyInstance!: ContentFinderNotifyInstance[]
}
