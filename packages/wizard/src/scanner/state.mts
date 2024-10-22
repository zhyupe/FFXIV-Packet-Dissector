import { Answers } from 'inquirer'
import { OpcodeResult, Scanner, ScannerPrompt } from './interface.mjs'
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { DeucalionPacket } from 'pcap'
import { hex, PacketSource } from './helper.mjs'

export interface StateOptions {
  outDir: string
  version: string
}

export class StateManager {
  constructor(private scanners: Scanner[], private options: StateOptions) {
    this.#readState()
    this.readyPromise = this.nextScanner().then(() => {
      this.ready = true
    })

    const { outDir, version } = options
    try {
      mkdirSync(join(outDir, version), { recursive: true })
    } catch (e) {
      //
    }
  }

  #recognizedClientOpcodes = new Set<number>()
  #recognizedServerOpcodes = new Set<number>()
  #state = new Map<string, OpcodeResult>()

  #scannerIndex = -1
  #scannerAnswer: Answers = {}

  #context: Record<string, string> = {}
  public finished = false
  public ready = false
  public readyPromise: Promise<void>

  async handle(packet: DeucalionPacket): Promise<boolean> {
    if (this.finished) {
      return false
    }

    if (!this.ready) {
      await this.readyPromise
    }

    const scanner = this.scanners[this.#scannerIndex]
    if (packet.origin !== scanner.source) {
      return false
    }

    const opcode = packet.header.type
    if (this.#isRecognized(packet.origin, opcode)) {
      return false
    }

    const result = await scanner.handler(
      packet,
      this.#scannerAnswer,
      this.#context,
    )

    if (result) {
      this.#setRecognized(scanner.name, {
        ...result,
        value: opcode,
        source: scanner.source,
      })
      return true
    }

    return false
  }

  async nextScanner() {
    ++this.#scannerIndex
    while (this.#scannerIndex < this.scanners.length) {
      const scanner = this.scanners[this.#scannerIndex]
      const state = this.#state.get(scanner.name)
      if (state?.value) {
        this.#scannerIndex += 1
        console.log(
          '[%d/%d] (%s) %s: %s',
          this.#scannerIndex,
          this.scanners.length,
          scanner.source,
          scanner.name,
          hex(state.value),
        )
        this.#getRecognizedSet(scanner.source).add(state.value)
        continue
      }

      console.log(
        '[%d/%d] (%s) %s: %s',
        this.#scannerIndex,
        this.scanners.length,
        scanner.source,
        scanner.name,
        scanner.instruction,
      )

      if (scanner.prompt) {
        await this.#inquire(scanner.name, scanner.prompt)
        this.#writeState()
      }

      break
    }

    if (this.#scannerIndex >= this.scanners.length) {
      this.finished = true
      return null
    }
  }

  output() {
    this.#writeJson(
      'opcode.json',
      Array.from(this.#state.entries())
        .filter(([_, { value }]) => value)
        .map(([name, { value, comment }]) => [name, hex(value!), comment]),
      true,
    )
    console.log('Written opcode.json')
  }

  #getRecognizedSet(source: PacketSource) {
    if (source === PacketSource.Client) {
      return this.#recognizedClientOpcodes
    } else {
      return this.#recognizedServerOpcodes
    }
  }

  #isRecognized(source: PacketSource, opcode: number) {
    return this.#getRecognizedSet(source).has(opcode)
  }

  #setRecognized(name: string, result: OpcodeResult) {
    this.#getRecognizedSet(result.source).add(result.value)
    this.#state.set(name, result)
    this.#writeState()

    console.log(
      '  %s: %s;%s',
      name,
      hex(result.value),
      result.comment ? ` // ${result.comment}` : '',
    )
  }

  #path(name: string, withVersion = false) {
    const { outDir, version } = this.options
    const dir = withVersion ? join(outDir, version) : outDir
    return join(dir, name)
  }

  #readJson(name: string, withVersion = false) {
    try {
      return JSON.parse(readFileSync(this.#path(name, withVersion), 'utf-8'))
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        return null
      }

      throw e
    }
  }

  #writeJson(name: string, content: any, withVersion = false) {
    writeFileSync(
      this.#path(name, withVersion),
      JSON.stringify(content, null, 2),
    )
  }

  #readState() {
    this.#state = new Map(this.#readJson('state.json', true))
    this.#context = this.#readJson('context.json') || {}
  }

  #writeState() {
    this.#writeJson('state.json', Array.from(this.#state.entries()), true)
    this.#writeJson('context.json', this.#context)
  }

  async #inquire<T extends Answers>(name: string, prompts: ScannerPrompt<T>) {
    const answers: Answers = {}
    const prefix = `${name}:`
    for (const [key, value] of Object.entries(this.#context)) {
      if (key[0] === '$') {
        answers[key] = value
      } else if (key.startsWith(prefix)) {
        answers[key.slice(prefix.length)] = value
      }
    }

    await prompts(answers as T)
    console.log(name, answers)
    this.#scannerAnswer = answers

    for (const [key, value] of Object.entries(answers)) {
      if (key[0] === '$') {
        this.#context[key] = value
      } else {
        this.#context[`${prefix}${key}`] = value
      }
    }
  }
}
