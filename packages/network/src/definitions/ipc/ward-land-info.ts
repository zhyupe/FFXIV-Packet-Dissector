import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field, format } from '@/struct/struct.decorator'
import { WardLandItem } from './common/ward-land-item'

export class WardLandInfo extends Struct {
  @field(FieldType.uint, 2, 2)
  section!: number

  @field(FieldType.uint, 4, 2)
  @format({ db: 'TerritoryType', append: 'enum' })
  territoryType!: number

  @field(FieldType.uint, 6, 2)
  @format({ db: 'World' })
  world!: number

  @field(FieldType.array, 8, 60 * WardLandItem.byteLength)
  @child(WardLandItem)
  list!: WardLandItem[]
}
