import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format, ipcEnum } from '@/struct/struct.decorator'

const PublicMessageType = {
  Shout: 11,
  Yell: 30,
  Say: 10,
} as const

@ipcEnum('PublicMessageType', PublicMessageType)
export class PublicMessage extends Struct {
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

  @field(FieldType.byte, 15)
  reserved0!: number

  @field(FieldType.string, 16, 32)
  nickname!: string

  @field(FieldType.string, 48)
  content!: string
}
