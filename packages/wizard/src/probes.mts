import { all, any, field } from './sdk/index.mjs'
import type { Condition } from '@ffxiv/contracts'
// Offsets start at the IPC body. These preserve the corresponding imported predicates.
export const probes: Record<string, { lengths: number[]; match: Condition }> = {
  UpdateHpMpTp: {
    lengths: [8, 16],
    match: all(field(0, 4, '$maxHP'), any(field(4, 2, 10000), field(4, 2, 0))),
  },
  UpdateClassInfo: { lengths: [16], match: field(4, 2, '0') },
  ClientTrigger: { lengths: [32], match: field(0, 4, 1) },
  PlayerStats: {
    lengths: [144],
    match: all(
      field(24, 4, '$maxHP'),
      any(field(28, 4, 10000), field(28, 4, 0)),
      any(field(32, 4, 10000), field(32, 4, 0)),
    ),
  },
  WorldVisitQueue: {
    lengths: [16],
    match: all(field(0, 4, 3), field(4, 4, 0), field(8, 4, 0)),
  },
  ItemMarketBoardInfo: { lengths: [32], match: field(16, 4, 123456) },
}
