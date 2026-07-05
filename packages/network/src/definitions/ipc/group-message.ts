import { Base } from '@/generate/lua/wireshark'
import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format, ipcEnum } from '@/struct/struct.decorator'

const GroupMessageType = {
  Linkshell: 2,
  FreeCompany: 3,
  NoviceNetwork: 4,
  Time: 333,
} as const

@ipcEnum('GroupMessageType', GroupMessageType)
export class GroupMessage extends Struct {
  @field(FieldType.uint, 0, 4)
  groupId!: number

  @field(FieldType.uint, 4, 2)
  @format({ enum: 'GroupMessageType' })
  type!: number

  @field(FieldType.uint, 6, 2)
  @format({ db: 'server' })
  server!: number

  @field(FieldType.biguint, 8)
  @format({ base: Base.HEX })
  uniqueId!: bigint

  @field(FieldType.uint, 16, 4)
  characterId!: number

  @field(FieldType.uint, 20, 2)
  @format({ db: 'server' })
  userServer!: number

  @field(FieldType.uint, 22, 2)
  @format({ db: 'server' })
  userServer2!: number

  @field(FieldType.byte, 24)
  reserved0!: number

  @field(FieldType.string, 25, 32)
  @format({ check_length: true })
  nickname!: string

  @field(FieldType.string, 57)
  @format({ check_length: true })
  content!: string
}
