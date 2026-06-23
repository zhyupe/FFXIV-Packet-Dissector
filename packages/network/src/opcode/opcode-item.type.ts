import type { NormalizedOpcode } from './normalized-opcode.enum'

export interface OpcodeItem {
  outgoing?: boolean
  title?: string
  type: NormalizedOpcode
  size?: number
}
