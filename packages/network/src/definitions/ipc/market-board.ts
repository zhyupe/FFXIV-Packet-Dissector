import { FieldType } from '@/struct/field-type.enum'
import { Struct } from '@/struct/struct'
import { child, dissector, field } from '@/struct/struct.decorator'

class MarketBoardSearchItem extends Struct {
  static byteLength = 8

  @field(FieldType.uint, 0, 4)
  @dissector({ db: 'Item' })
  itemCatalogId!: number

  @field(FieldType.uint, 4, 2)
  quantity!: number

  @field(FieldType.uint, 6, 2)
  demand!: number
}

export class MarketBoardSearchResult extends Struct {
  @field(FieldType.array, 0, 20 * MarketBoardSearchItem.byteLength)
  @child(MarketBoardSearchItem)
  items!: MarketBoardSearchItem[]

  @field(FieldType.uint, 160, 4)
  itemIndexEnd!: number

  @field(FieldType.uint, 164, 4)
  padding1!: number

  @field(FieldType.uint, 168, 4)
  itemIndexStart!: number

  @field(FieldType.uint, 172, 4)
  requestId!: number
}

class MarketBoardHistoryListing extends Struct {
  static byteLength = 48

  @field(FieldType.uint, 0, 4)
  salePrice!: number

  @field(FieldType.uint, 4, 4)
  purchaseTime!: number

  @field(FieldType.uint, 8, 4)
  quantity!: number

  @field(FieldType.byte, 12)
  isHq!: number

  @field(FieldType.byte, 13)
  onMannequin!: number

  @field(FieldType.string, 14, 32)
  @dissector({ append: 'val' })
  buyerName!: string

  @field(FieldType.uint, 46, 2)
  padding!: number
}

export class MarketBoardItemListingHistory extends Struct {
  @field(FieldType.uint, 0, 4)
  @dissector({ db: 'Item' })
  itemCatalogId!: number

  @field(FieldType.array, 4, 20 * MarketBoardHistoryListing.byteLength)
  @child(MarketBoardHistoryListing)
  listings!: MarketBoardHistoryListing[]
}

class MarketBoardListing extends Struct {
  static byteLength = 144

  @field(FieldType.biguint, 0)
  listingId!: bigint

  @field(FieldType.biguint, 8)
  retainerId!: bigint

  @field(FieldType.biguint, 16)
  retainerOwnerId!: bigint

  @field(FieldType.biguint, 24)
  artisanId!: bigint

  @field(FieldType.uint, 32, 4)
  pricePerUnit!: number

  @field(FieldType.uint, 36, 4)
  totalTax!: number

  @field(FieldType.uint, 40, 4)
  quantity!: number

  @field(FieldType.uint, 44, 4)
  @dissector({ db: 'Item' })
  itemId!: number

  @field(FieldType.uint, 48, 2)
  slot!: number

  @field(FieldType.uint, 50, 2)
  durability!: number

  @field(FieldType.uint, 52, 2)
  spiritbond!: number

  @field(FieldType.array, 54, 5 * 2)
  @child({ type: FieldType.uint, byteLength: 2 })
  materia!: number[]

  @field(FieldType.uint, 64, 2)
  padding1!: number

  @field(FieldType.uint, 66, 4)
  padding2!: number

  @field(FieldType.string, 70, 32)
  @dissector({ append: 'val', check_length: true })
  retainerName!: string

  @field(FieldType.string, 102, 32)
  @dissector({ append: 'val', check_length: true })
  playerName!: string

  @field(FieldType.byte, 134)
  hq!: number

  @field(FieldType.byte, 135)
  materiaCount!: number

  @field(FieldType.byte, 136)
  onMannequin!: number

  @field(FieldType.byte, 137)
  city!: number

  @field(FieldType.byte, 138)
  primaryDyeId!: number

  @field(FieldType.byte, 139)
  secondaryDyeId!: number

  @field(FieldType.uint, 140, 4)
  padding3!: number
}

export class MarketBoardItemListing extends Struct {
  @field(FieldType.array, 0, 10 * MarketBoardListing.byteLength)
  @child(MarketBoardListing)
  listings!: MarketBoardListing[]

  @field(FieldType.byte, 1440)
  listingIndexEnd!: number

  @field(FieldType.byte, 1441)
  listingIndexStart!: number

  @field(FieldType.uint, 1442, 2)
  requestId!: number
}

export class MarketBoardItemListingCount extends Struct {
  @field(FieldType.uint, 0, 4)
  status!: number

  @field(FieldType.uint, 4, 4)
  quantity!: number
}

export class MarketBoardPurchase extends Struct {
  @field(FieldType.uint, 0, 4)
  @dissector({ db: 'Item' })
  itemId!: number

  @field(FieldType.uint, 8, 4)
  quantity!: number
}

export class MarketBoardPurchaseHandler extends Struct {
  @field(FieldType.biguint, 0)
  retainerId!: bigint

  @field(FieldType.biguint, 8)
  listingId!: bigint

  @field(FieldType.uint, 16, 4)
  @dissector({ db: 'Item' })
  itemId!: number

  @field(FieldType.uint, 20, 4)
  pricePerUnit!: number

  @field(FieldType.uint, 24, 4)
  quantity!: number
}

export class ItemMarketBoardInfo extends Struct {
  @field(FieldType.uint, 0, 4)
  sequence!: number

  @field(FieldType.uint, 4, 4)
  containerId!: number

  @field(FieldType.uint, 8, 4)
  slot!: number

  @field(FieldType.uint, 12, 4)
  unknown0!: number

  @field(FieldType.uint, 16, 4)
  unitPrice!: number
}
