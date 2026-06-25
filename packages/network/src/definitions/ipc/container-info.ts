import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { dissector, field } from '@/struct/struct.decorator'

export class ContainerInfo extends Struct {
  @field(FieldType.uint, 0, 4)
  containerSequence!: number

  @field(FieldType.uint, 4, 4)
  @dissector({ append: 'val' })
  numItems!: number

  @field(FieldType.uint, 8, 4)
  @dissector({ enum: 'ItemLocation', append: 'enum' })
  containerId!: number

  @field(FieldType.uint, 12, 4)
  unknown!: number
}
