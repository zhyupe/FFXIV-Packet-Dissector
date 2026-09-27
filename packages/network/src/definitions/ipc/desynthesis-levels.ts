import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { field, format } from '@/struct/struct.decorator'

// Eight crafting jobs in ClassJob order; wire values are hundredths of a level.
export class DesynthesisLevels extends Struct {
  @field(FieldType.uint, 0, 4)
  @format({ divisor: 100 })
  carpenter!: number

  @field(FieldType.uint, 4, 4)
  @format({ divisor: 100 })
  blacksmith!: number

  @field(FieldType.uint, 8, 4)
  @format({ divisor: 100 })
  armorer!: number

  @field(FieldType.uint, 12, 4)
  @format({ divisor: 100 })
  goldsmith!: number

  @field(FieldType.uint, 16, 4)
  @format({ divisor: 100 })
  leatherworker!: number

  @field(FieldType.uint, 20, 4)
  @format({ divisor: 100 })
  weaver!: number

  @field(FieldType.uint, 24, 4)
  @format({ divisor: 100 })
  alchemist!: number

  @field(FieldType.uint, 28, 4)
  @format({ divisor: 100 })
  culinarian!: number
}
