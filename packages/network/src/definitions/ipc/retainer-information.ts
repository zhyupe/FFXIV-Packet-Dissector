import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format } from '@/struct/struct.decorator'

export class RetainerInformation extends Struct {
  @field(FieldType.biguint, 0)
  @format({ base: Base.HEX })
  uniqueId!: bigint

  @field(FieldType.uint, 8, 4)
  @format({ base: Base.HEX })
  characterId!: number

  @field(FieldType.uint, 12, 2)
  @format({ db: 'World' })
  userServer!: number

  @field(FieldType.byte, 14)
  @format({ enum: 'PublicMessageType' })
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
  @format({ db: 'ClassJob' })
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
