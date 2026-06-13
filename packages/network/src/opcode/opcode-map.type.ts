import type { NormalizedOpcode } from './normalized-opcode.enum'
import type { OpcodeItem } from './opcode-item.type'

export type OpcodeMap = Record<
  number,
  NormalizedOpcode | OpcodeItem[] | undefined
>
