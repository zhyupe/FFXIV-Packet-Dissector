import { NormalizedOpcode } from './normalized-opcode.enum'
import { OpcodeItem } from './opcode-item.type'

export type OpcodeMap = Record<number, NormalizedOpcode | OpcodeItem[] | undefined>
