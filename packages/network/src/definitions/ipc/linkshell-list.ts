import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, dissector, field, ipcIf } from '@/struct/struct.decorator'

@ipcIf('id')
export class LinkshellItem extends Struct {
  static byteLength = 56

  @field(FieldType.uint, 0, 4)
  id!: number

  @field(FieldType.uint, 4, 2)
  unknown0!: number

  @field(FieldType.uint, 6, 2)
  @dissector({ db: 'World' })
  server1!: number

  @field(FieldType.uint, 8, 4)
  id2!: number

  @field(FieldType.uint, 12, 2)
  unknown1!: number

  @field(FieldType.uint, 14, 2)
  @dissector({ db: 'World' })
  server2!: number

  @field(FieldType.byte, 17)
  rank!: number

  @field(FieldType.uint, 18, 2)
  padding!: number

  @field(FieldType.string, 20, 36)
  @dissector({ append: 'val' })
  name!: string
}

export class LinkshellList extends Struct {
  @field(FieldType.array, 0, 8 * LinkshellItem.byteLength)
  @child(LinkshellItem)
  linkshellItem!: LinkshellItem[]
}
