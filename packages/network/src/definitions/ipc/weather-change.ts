import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field } from '@/struct/struct.decorator'

export class WeatherChange extends Struct {
  @field(FieldType.uint, 0, 4)
  weatherId!: number

  @field(FieldType.float, 4)
  delay!: number
}
