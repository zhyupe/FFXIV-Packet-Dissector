import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { dissector, field } from '@/struct/struct.decorator'

export class RetainerInformation extends Struct {
  @field(FieldType.biguint, 0)
  @dissector({ base: 'HEX' })
  uniqueId!: bigint

  @field(FieldType.uint, 8, 4)
  @dissector({ base: 'HEX' })
  characterId!: number

  @field(FieldType.uint, 12, 2)
  @dissector({ db: 'World' })
  userServer!: number

  @field(FieldType.byte, 14)
  @dissector({ enum: 'PublicMessageType' })
  type!: number

  @field(FieldType.byte, 17)
  inventoryCount!: number

  @field(FieldType.uint, 20, 4)
  gold!: number

  @field(FieldType.byte, 24)
  sellingCount!: number

  @field(FieldType.byte, 25)
  market!: number

  @field(FieldType.byte, 26)
  @dissector({ db: 'ClassJob' })
  classJob!: number

  @field(FieldType.byte, 27)
  level!: number

  @field(FieldType.uint, 28, 4)
  sellEndTime!: number

  @field(FieldType.uint, 36, 4)
  advEndTime!: number

  @field(FieldType.byte, 40)
  reserved!: number

  @field(FieldType.string, 41, 32)
  nickname!: string
}
