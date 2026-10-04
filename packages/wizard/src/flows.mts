/** Registration order remains the observation order. Dependencies also apply to direct selection. */
export const prerequisites: Record<string, string[]> = {
  UpdateSearchInfo: ['SetSearchInfoHandler'],
  ExamineSearchInfo: ['SetSearchInfoHandler'],
  CurrencyCrystalInfo: ['ActorCast'],
  InitZone: ['ActorCast'],
  WeatherChange: ['ActorCast'],
  ActorMove: ['ActorCast'],
  InventoryActionAck: ['InventoryModifyHandler'],
  InventoryTransaction: ['InventoryModifyHandler'],
  InventoryTransactionFinish: ['InventoryTransaction'],
  NpcSpawn: ['RetainerInformation'],
}
export const continuation = new Set([
  'UpdateSearchInfo',
  'CurrencyCrystalInfo',
  'InitZone',
  'WeatherChange',
  'ActorMove',
  'InventoryActionAck',
  'InventoryTransaction',
  'InventoryTransactionFinish',
  'MarketBoardItemListingCount',
  'MarketBoardItemListing',
  'MarketBoardPurchase',
])
export const produces: Record<string, string[]> = {
  InventoryModifyHandler: ['inventoryOperation'],
  InventoryTransaction: ['inventoryOperation'],
}
