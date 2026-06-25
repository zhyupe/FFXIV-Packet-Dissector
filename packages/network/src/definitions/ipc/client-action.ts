import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { dissector, field, ipcEnum } from '@/struct/struct.decorator'

const ClientActionType = {
  Action: 8,
  CraftAction: 9,
  InvalidAction: 10,
} as const

@ipcEnum('ClientActionType', ClientActionType)
export class ClientAction extends Struct {
  @field(FieldType.uint, 0, 4)
  unknown1!: number

  @field(FieldType.uint, 4, 4)
  unknown2!: number

  @field(FieldType.uint, 8, 2)
  @dissector({ enum: 'ClientActionType' })
  type!: number

  @field(FieldType.uint, 10, 2)
  unknown3!: number

  @field(FieldType.uint, 12, 4)
  @dissector({ db: 'Action' })
  action!: number

  @field(FieldType.uint, 16, 4)
  unknown4!: number

  @field(FieldType.uint, 20, 4)
  unknown5!: number
}
