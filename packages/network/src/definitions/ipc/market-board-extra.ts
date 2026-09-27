import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, field } from '@/struct/struct.decorator'

export class MarketBoardSale extends Struct {
  static byteLength = 24

  @field(FieldType.uint, 0, 4)
  itemId!: number

  @field(FieldType.uint, 4, 4)
  quantity!: number

  @field(FieldType.uint, 8, 4)
  unitPrice!: number

  @field(FieldType.uint, 12, 4)
  totalTax!: number

  @field(FieldType.byte, 16)
  saleType!: number

  @field(FieldType.byte, 17)
  townId!: number

  @field(FieldType.bytes, 18, 6)
  padding!: Buffer
}
export class ItemMarketBoardSummary extends Struct {
  static byteLength = 8

  @field(FieldType.uint, 0, 4)
  sequence!: number

  @field(FieldType.uint, 4, 4)
  itemCount!: number
}
export class RetainerSummary extends Struct {
  static byteLength = 24

  @field(FieldType.uint, 0, 4)
  sequence!: number

  @field(FieldType.byte, 4)
  informationCount!: number

  @field(FieldType.byte, 5)
  maxRetainers!: number

  @field(FieldType.byte, 6)
  isCallbackResponse!: number

  @field(FieldType.byte, 7)
  padding!: number

  @field(FieldType.uint, 8, 4)
  callbackIndex!: number

  @field(FieldType.array, 12, 10)
  @child({ type: FieldType.byte, byteLength: 1 })
  displayOrder!: number[]

  @field(FieldType.bytes, 22, 2)
  padding2!: Buffer
}
export class RetainerState extends Struct {
  static byteLength = 56

  @field(FieldType.biguint, 0)
  retainerId!: bigint

  @field(FieldType.biguint, 8)
  flags!: bigint

  @field(FieldType.uint, 16, 4)
  customMessageId!: number

  @field(FieldType.byte, 20)
  stateChange!: number

  @field(FieldType.string, 21, 32)
  name!: string

  @field(FieldType.bytes, 53, 3)
  padding!: Buffer
}
