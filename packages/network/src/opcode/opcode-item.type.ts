import { NormalizedOpcode } from './normalized-opcode.enum'

export interface OpcodeItem {
  outgoing?: boolean
  type: NormalizedOpcode
  size?: number
}
