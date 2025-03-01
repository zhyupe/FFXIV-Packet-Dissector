import { NormalizedOpcode } from './normalized-opcode.enum'
import { PacketMap } from '../ipc'

export type ParsableOpcode = {
  [K in NormalizedOpcode]: undefined extends typeof PacketMap[K] ? never : K
}[NormalizedOpcode]
