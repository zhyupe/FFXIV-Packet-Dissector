import { Struct } from '@/struct/struct'
import { field, child } from '@/struct/struct.decorator'
import { FieldType } from '@/struct/field-type.enum'
import { WardLandItem } from './common/ward-land-item'

export class WardLandInfo extends Struct {
  @field(FieldType.uint, 2, 2)
  section!: number

  @field(FieldType.uint, 4, 2)
  territoryType!: number

  @field(FieldType.uint, 6, 2)
  world!: number

  @field(FieldType.array, 8, 60 * WardLandItem.byteLength)
  @child(WardLandItem)
  list!: WardLandItem[]
}
