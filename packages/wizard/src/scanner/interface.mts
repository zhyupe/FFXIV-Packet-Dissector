import type { Condition, Length } from '@ffxiv/contracts'
export interface DeucalionPacket {
  data: Uint8Array
  header: { sourceActor: number; targetActor: number; type: number }
  origin: 'S' | 'C'
}
import type { PacketSource } from './helper.mjs'

export type Answers = Record<string, string | number>
export interface InputField {
  key: string
  label: string
  type: 'text' | 'number'
  required: boolean
  shared?: boolean
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
  length?: Length
  probe?: Condition
  requires?: string[]
  continuation?: boolean
  produces?: string[]
  handler?: (
    packet: DeucalionPacket,
    answer: Answers,
    context: Answers,
  ) => Pick<OpcodeResult, 'comment'> | null
}
