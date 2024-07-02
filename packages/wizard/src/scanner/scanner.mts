import { DeucalionPacket } from 'pcap'
import { PacketSource, hex } from './helper.mjs'
import inquirer, { Answers, QuestionCollection } from 'inquirer'
import { Writable } from 'stream'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export interface Scanner<T extends Answers = Answers> {
  name: string
  instruction: string
  source: PacketSource
  prompt?: QuestionCollection<T>
  handler: (
    packet: DeucalionPacket,
    answer: Answers,
    context: Record<string, string>,
  ) => boolean | string
}

export interface OpcodeResult {
  value?: number
  comment?: string
}

export interface OpcodeState extends OpcodeResult {
  answer?: Answers
}

export class ScannerRunner extends Writable {
  #recognizedOpcodes = new Set<number>()
  #state = new Map<string, OpcodeState>()

  #instructionIssued = -1
  #scannerIndex = 0
  #scannerAnswer: Answers | null = null

  #context: Record<string, string> = {}
  public finished = false

  constructor(
    private scanners: Scanner[],
    private options: {
      outDir: string
      onFinish: () => void
    },
  ) {
    super({
      objectMode: true,
    })

    this.#readState()
    while (this.#scannerIndex < scanners.length) {
      const scanner = scanners[this.#scannerIndex]
      const state = this.#state.get(scanner.name)
      const answer = state?.answer

      if (answer) {
        for (const [k, v] of Object.entries(answer)) {
          this.#context[`${scanner.name}:${k}`] = v
        }
      }

      if (state?.value) {
        this.#scannerIndex += 1
        continue
      }

      this.#scannerAnswer = answer || null
      break
    }

    this.#prepareScanner()
  }

  async _write(
    packet: DeucalionPacket,
    _: any,
    callback: (error?: Error) => void,
  ) {
    const opcode = packet.header.type
    if (this.#recognizedOpcodes.has(opcode)) {
      return callback()
    }

    // console.debug(
    //   '# %s origin %s dataLength %s',
    //   format(opcode),
    //   packet.origin,
    //   packet.data.length,
    // )

    if (this.#scannerIndex >= this.scanners.length) {
      this.options.onFinish()
      this.finished = true
      return callback()
    }

    const [scanner, state] = await this.#prepareScanner()
    if (scanner === null || state === null) {
      this.options.onFinish()
      this.finished = true
      return callback()
    }

    if (packet.origin !== scanner.source) {
      return callback()
    }

    const ret = scanner.handler(
      packet,
      this.#scannerAnswer || {},
      this.#context,
    )
    if (ret === false) {
      return callback()
    }

    this.#recognizedOpcodes.add(opcode)
    state.value = opcode
    state.comment = typeof ret === 'string' ? ret : undefined

    this.#writeState()
    console.log(
      '  %s: %s;%s',
      scanner.name,
      hex(state.value),
      state.comment ? ` // ${state.comment}` : '',
    )

    this.#scannerIndex += 1
    this.#scannerAnswer = null
    this.#prepareScanner()

    return callback()
  }

  output() {
    this.#writeJson(
      'opcode.json',
      Array.from(this.#state.entries())
        .filter(([_, { value }]) => value)
        .map(([name, { value, comment }]) => [name, hex(value!), comment]),
    )
  }

  async #prepareScanner() {
    const scanner = this.scanners[this.#scannerIndex]
    if (!scanner) {
      this.finished = true
      return [null, null] as const
    }

    if (!this.#state.has(scanner.name)) {
      this.#state.set(scanner.name, {})
    }

    const state = this.#state.get(scanner.name)!
    if (scanner.prompt && !this.#scannerAnswer) {
      this.#scannerAnswer = await inquirer.prompt(scanner.prompt)
      state.answer = this.#scannerAnswer
      this.#writeState()
    }

    if (this.#instructionIssued !== this.#scannerIndex) {
      console.log(
        '[%d/%d] %s: %s',
        this.#scannerIndex,
        this.scanners.length,
        scanner.name,
        scanner.instruction,
      )
      this.#instructionIssued = this.#scannerIndex
    }

    return [scanner, state] as const
  }

  #readJson(name: string) {
    try {
      return JSON.parse(readFileSync(join(this.options.outDir, name), 'utf-8'))
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        return null
      }

      throw e
    }
  }

  #writeJson(name: string, content: any) {
    writeFileSync(
      join(this.options.outDir, name),
      JSON.stringify(content, null, 2),
    )
  }

  #readState() {
    this.#state = new Map(this.#readJson('state.json'))
  }

  #writeState() {
    this.#writeJson('state.json', Array.from(this.#state.entries()))
  }
}
