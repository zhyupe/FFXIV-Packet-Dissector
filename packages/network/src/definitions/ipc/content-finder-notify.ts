import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field, format, ipcEnum, ipcIf } from '@/struct/struct.decorator'

@ipcIf('content')
export class ContentFinderNotifyInstance extends Struct {
  static byteLength = 4

  @field(FieldType.uint, 0, 4)
  @format({ db: 'ContentFinderCondition', append: 'enum' })
  content!: number
}

@ipcEnum('ContentsFinderQueueState', {
  None: 0,
  Pending: 1,
  Queued: 2,
  Ready: 3,
  Accepted: 4,
  InContent: 5,
})
export class ContentFinderNotify extends Struct {
  @field(FieldType.byte, 0)
  @format({ enum: 'ContentsFinderQueueState' })
  type!: number

  @field(FieldType.byte, 1)
  @format({ db: 'ClassJob' })
  classJob!: number

  @field(FieldType.byte, 2)
  @format({ base: Base.HEX })
  languageFlags!: number

  @field(FieldType.bytes, 3, 5)
  unknown1!: Buffer

  @field(FieldType.biguint, 8, 8)
  @format({ base: Base.HEX })
  flags!: bigint

  @field(FieldType.byte, 16)
  @format({ db: 'ContentRoulette' })
  roulette!: number

  @field(FieldType.bytes, 17, 2)
  unknown2!: Buffer

  // Bit 0 is passed to ContentsFinderQueueInfo.UpdateQueueState as beganQueue.
  @field(FieldType.byte, 19)
  @format({ base: Base.HEX })
  queueStartFlags!: number

  @field(FieldType.array, 20, 5 * ContentFinderNotifyInstance.byteLength)
  @child(ContentFinderNotifyInstance)
  contentFinderNotifyInstance!: ContentFinderNotifyInstance[]
}
