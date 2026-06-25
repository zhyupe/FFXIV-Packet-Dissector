import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { dissector, field } from '@/struct/struct.decorator'

export class ServerNotice extends Struct {
  @field(FieldType.byte, 0)
  padding!: number

  @field(FieldType.string, 1)
  @dissector({ check_length: true })
  content!: string
}

export class ServerNoticeShort extends ServerNotice {}
