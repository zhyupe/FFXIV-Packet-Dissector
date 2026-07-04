import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class IslandWorkshopSupplyDemand extends Struct {
  @field(FieldType.byte, 0)
  popularity!: number

  @field(FieldType.byte, 1)
  predictedPopularity!: number

  @field(FieldType.bytes, 2)
  supplyDemand!: Buffer
}
