import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { dissector, field } from '@/struct/struct.decorator'

export class CraftStatus extends Struct {
  @field(FieldType.uint, 0, 4)
  characterId!: number

  @field(FieldType.uint, 4, 4)
  unknown1!: number

  @field(FieldType.uint, 8, 2)
  unknown2!: number

  @field(FieldType.uint, 10, 2)
  unknown3!: number

  @field(FieldType.uint, 12, 4)
  unknown4!: number

  @field(FieldType.uint, 16, 2)
  unknown5!: number

  @field(FieldType.uint, 18, 2)
  unknown6!: number

  @field(FieldType.uint, 20, 4)
  unknown7!: number

  @field(FieldType.uint, 12, 4)
  @dissector({ db: 'Action' })
  action!: number

  @field(FieldType.uint, 16, 4)
  unknown8!: number

  @field(FieldType.uint, 20, 4)
  unknown9!: number
}
