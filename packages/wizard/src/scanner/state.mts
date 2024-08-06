import inquirer, { Answers, QuestionCollection } from 'inquirer'
import { OpcodeResult, Scanner, ScannerPrompt } from './interface.mjs'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { DeucalionPacket } from 'pcap'
import { hex } from './helper.mjs'

export class StateManager {
  constructor(private scanners: Scanner[], private outDir: string) {
    this.#readState()
    this.readyPromise = this.nextScanner().then(() => {
      this.ready = true
    })
  }

  #recognizedOpcodes = new Set<number>()
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

    const opcode = packet.header.type
    if (this.#isRecognized(opcode)) {
      return false
    }

    const scanner = this.scanners[this.#scannerIndex]
    if (packet.origin !== scanner.source) {
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
        this.#recognizedOpcodes.add(state.value)
        continue
      }

      console.log(
        '[%d/%d] %s: %s',
        this.#scannerIndex,
        this.scanners.length,
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
    )
  }

  #isRecognized(opcode: number) {
    return this.#recognizedOpcodes.has(opcode)
  }

  #setRecognized(name: string, result: OpcodeResult) {
    this.#recognizedOpcodes.add(result.value)
    this.#state.set(name, result)
    this.#writeState()

    console.log(
      '  %s: %s;%s',
      name,
      hex(result.value),
      result.comment ? ` // ${result.comment}` : '',
    )
  }

  #readJson(name: string) {
    try {
      return JSON.parse(readFileSync(join(this.outDir, name), 'utf-8'))
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        return null
      }

      throw e
    }
  }

  #writeJson(name: string, content: any) {
    writeFileSync(join(this.outDir, name), JSON.stringify(content, null, 2))
  }

  #readState() {
    this.#state = new Map(this.#readJson('state.json'))
    this.#context = this.#readJson('context.json') || {}
  }

  #writeState() {
    this.#writeJson('state.json', Array.from(this.#state.entries()))
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
