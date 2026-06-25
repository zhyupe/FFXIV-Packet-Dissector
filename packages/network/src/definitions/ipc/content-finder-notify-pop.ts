import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { dissector, field } from '@/struct/struct.decorator'

export class ContentFinderNotifyPop extends Struct {
  @field(FieldType.uint, 0, 2)
  unknown1!: number

  @field(FieldType.uint, 2, 2)
  roulette!: number

  @field(FieldType.uint, 4, 4)
  flags!: number

  @field(FieldType.uint, 8, 4)
  unknown3!: number

  @field(FieldType.uint, 12, 4)
  unknown4!: number

  @field(FieldType.uint, 16, 4)
  unknown5!: number

  @field(FieldType.uint, 20, 2)
  @dissector({ db: 'ContentFinderCondition' })
  content!: number

  @field(FieldType.uint, 22, 2)
  unknown6!: number

  @field(FieldType.byte, 24)
  unknown7!: number

  @field(FieldType.byte, 25)
  requireTank!: number

  @field(FieldType.byte, 26)
  unknown8!: number

  @field(FieldType.byte, 27)
  requireHealth!: number

  @field(FieldType.byte, 28)
  unknown9!: number

  @field(FieldType.byte, 29)
  requireDps!: number

  @field(FieldType.uint, 30, 2)
  unknown10!: number
}
