import type { PacketMap } from '../ipc'
import type { NormalizedOpcode } from './normalized-opcode.enum'

export type ParsableOpcode = {
  [K in NormalizedOpcode]: undefined extends (typeof PacketMap)[K] ? never : K
}[NormalizedOpcode]
