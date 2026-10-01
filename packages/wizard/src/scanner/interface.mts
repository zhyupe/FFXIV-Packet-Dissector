import type { DeucalionPacket } from 'pcap'
import type { PacketSource } from './helper.mjs'

export type Answers = Record<string, string | number>
export interface InputField {
  key: string
  label: string
  type: 'text' | 'number'
  required: boolean
}
export interface OpcodeResult {
  source: PacketSource
  value: number
  comment?: string
}
export interface Scanner {
  name: string
  instruction: string
  source: PacketSource
  fields: InputField[]
  handler: (
    packet: DeucalionPacket,
    answer: Answers,
    context: Answers,
  ) => Pick<OpcodeResult, 'comment'> | null
}
