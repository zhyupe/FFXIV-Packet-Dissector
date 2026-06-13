import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field } from '@/struct/struct.decorator'
import { SubmarineStatusItem } from './common/submarine'

export class SubmarineStatusList extends Struct {
  @field(FieldType.array, 0, 4 * SubmarineStatusItem.byteLength)
  @child(SubmarineStatusItem)
  items!: SubmarineStatusItem[]
}
