import { PacketSource } from './helper.mjs'
import { Answers } from 'inquirer'
import { DeucalionPacket } from 'pcap'

export interface OpcodeResult {
  source: PacketSource
  value: number
  comment?: string
}

export type ScannerPrompt<T> = (answer: T) => Promise<void>

export interface Scanner<T extends Answers = Answers> {
  name: string
  instruction: string
  source: PacketSource
  prompt?: ScannerPrompt<T>
  handler: (
    packet: DeucalionPacket,
    answer: Answers,
    context: Record<string, any>,
  ) => Pick<OpcodeResult, 'comment'> | null
}
