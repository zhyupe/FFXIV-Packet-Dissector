import { EventEmitter } from 'node:events'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { DeucalionPacket } from 'pcap'
import type { Answers, OpcodeResult, Scanner } from './interface.mjs'

export const SCANNER_REVISION = 1
export type WizardStatus =
  | 'idle'
  | 'input'
  | 'running'
  | 'stopped'
  | 'completed'
  | 'conflict'
  | 'failed'
export interface WizardSnapshot {
  status: WizardStatus
  mode: 'sequence' | 'single'
  current: string | null
  inputToken: number
  fields: Scanner['fields']
  steps: Pick<Scanner, 'name' | 'instruction' | 'source'>[]
  results: [string, OpcodeResult][]
  error: string
  conflict: string | null
}
export function atomicJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true })
  const temporary = `${path}.tmp`
  writeFileSync(temporary, JSON.stringify(value, null, 2), 'utf8')
  renameSync(temporary, path)
}

export class WizardEngine extends EventEmitter {
  private status: WizardStatus = 'idle'
  private index = 0
  private mode: 'sequence' | 'single' = 'sequence'
  private token = 0
  private answers: Answers = Object.create(null)
  private context: Answers = Object.create(null)
  private results = new Map<string, OpcodeResult>()
  private error = ''
  private conflict: string | null = null

  constructor(
    private scanners: Scanner[],
    private statePath?: string,
  ) {
    super()
    if (new Set(scanners.map((s) => s.name)).size !== scanners.length)
      throw new Error('DUPLICATE_SCANNER')
    if (statePath) this.restore(statePath)
  }

  snapshot(): WizardSnapshot {
    const scanner = this.scanners[this.index]
    return {
      status: this.status,
      mode: this.mode,
      current: scanner?.name ?? null,
      inputToken: this.token,
      fields:
        this.status === 'input'
          ? scanner.fields.filter((f) => !(f.key in this.answers))
          : [],
      steps: this.scanners.map(({ name, instruction, source }) => ({
        name,
        instruction,
        source,
      })),
      results: Array.from(this.results.entries()),
      error: this.error,
      conflict: this.conflict,
    }
  }
  private changed() {
    this.emit('changed', this.snapshot())
  }

  start(mode: 'sequence' | 'single' = 'sequence', name?: string) {
    if (name !== undefined) {
      const index = this.scanners.findIndex((s) => s.name === name)
      if (index < 0) throw new Error('UNKNOWN_STEP')
      this.index = index
    }
    this.mode = mode
    if (mode === 'sequence')
      while (
        this.index < this.scanners.length &&
        this.results.has(this.scanners[this.index].name)
      )
        this.index++
    this.prepare()
  }
  selectStep(name: string) {
    this.start('single', name)
  }

  private prepare() {
    this.token++
    this.error = ''
    this.conflict = null
    this.answers = Object.create(null)
    const scanner = this.scanners[this.index]
    if (!scanner) this.status = 'completed'
    else {
      for (const field of scanner.fields)
        if (field.key.startsWith('$') && field.key in this.context)
          this.answers[field.key] = this.context[field.key]
      this.status = scanner.fields.some((f) => !(f.key in this.answers))
        ? 'input'
        : 'running'
    }
    this.save()
    this.changed()
  }

  submitInputs(token: number, answers: Answers) {
    if (token !== this.token || this.status !== 'input')
      throw new Error('STALE_INPUT')
    const scanner = this.scanners[this.index]
    const pending: Answers = Object.create(null)
    for (const field of scanner.fields) {
      const value = this.answers[field.key] ?? answers[field.key]
      if (
        field.type === 'number'
          ? typeof value !== 'number' || !Number.isFinite(value) || value < 0
          : typeof value !== 'string' ||
            value.length > 4096 ||
            (field.required && !value.trim())
      )
        throw new Error('INVALID_INPUT')
      pending[field.key] = value
    }
    this.answers = pending
    for (const field of scanner.fields)
      if (field.key.startsWith('$'))
        this.context[field.key] = pending[field.key]
    this.status = 'running'
    this.changed()
  }

  write(packet: DeucalionPacket) {
    if (this.status !== 'running') return
    const scanner = this.scanners[this.index]
    if (!scanner || scanner.source !== packet.origin) return
    // Exclude other recognized opcodes, but allow the current step to be re-recognized.
    const owner = [...this.results].find(
      ([name, r]) =>
        name !== scanner.name &&
        r.source === packet.origin &&
        r.value === packet.header.type,
    )
    try {
      const found = scanner.handler(packet, this.answers, this.context)
      if (!found) return
      if (owner) {
        this.status = 'conflict'
        this.conflict = owner[0]
        this.changed()
        return
      }
      const comment =
        found.comment && /^Base offset: 0x[0-9a-f]+$/i.test(found.comment)
          ? found.comment
          : undefined
      this.results.set(scanner.name, {
        source: packet.origin,
        value: packet.header.type,
        ...(comment ? { comment } : {}),
      })
      this.save()
      if (this.mode === 'single') {
        this.status = 'stopped'
        this.changed()
      } else {
        this.index++
        this.start('sequence')
      }
    } catch (error) {
      if (error instanceof RangeError) return // A non-matching short packet is not a scanner result.
      this.status = 'failed'
      this.error =
        error instanceof Error && error.message === 'SAVE_FAILED'
          ? 'SAVE_FAILED'
          : 'SCANNER_OR_SAVE_FAILED'
      this.changed()
    }
  }

  skip() {
    this.index++
    this.mode = 'sequence'
    this.start('sequence')
  }
  stop(clearInputs = false) {
    this.status = 'stopped'
    this.token++
    this.answers = Object.create(null)
    if (clearInputs) this.context = Object.create(null)
    this.save()
    this.changed()
  }
  save() {
    if (!this.statePath) return
    try {
      atomicJson(this.statePath, {
        revision: SCANNER_REVISION,
        current: this.scanners[this.index]?.name ?? null,
        results: [...this.results],
      })
      if (this.error === 'SAVE_FAILED') {
        this.error = ''
        this.status = 'stopped'
        this.changed()
      }
    } catch {
      this.status = 'failed'
      this.error = 'SAVE_FAILED'
      this.changed()
      throw new Error('SAVE_FAILED')
    }
  }
  exportResults() {
    return [...this.results].map(([name, result]) => [
      name,
      `0x${result.value.toString(16).padStart(4, '0')}`,
      result.comment ?? null,
    ])
  }

  private restore(path: string) {
    let data: any
    try {
      const text = readFileSync(path, 'utf8')
      if (text.length > 1024 * 1024) throw new Error('STATE_TOO_LARGE')
      data = JSON.parse(text)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
      throw new Error('STATE_READ_FAILED')
    }
    if (data.revision !== SCANNER_REVISION) return
    if (!Array.isArray(data.results)) throw new Error('INVALID_STATE')
    const seen = new Set<string>()
    for (const entry of data.results) {
      if (!Array.isArray(entry) || entry.length !== 2)
        throw new Error('INVALID_STATE')
      const [name, r] = entry
      const scanner = this.scanners.find((s) => s.name === name)
      if (
        !scanner ||
        this.results.has(name) ||
        !r ||
        r.source !== scanner.source ||
        !Number.isInteger(r.value) ||
        r.value < 0 ||
        r.value > 65535 ||
        seen.has(`${r.source}:${r.value}`)
      )
        throw new Error('INVALID_STATE')
      seen.add(`${r.source}:${r.value}`)
      this.results.set(name, {
        source: r.source,
        value: r.value,
        ...(/^Base offset: 0x[0-9a-f]+$/i.test(r.comment ?? '')
          ? { comment: r.comment }
          : {}),
      })
    }
    const index = this.scanners.findIndex((s) => s.name === data.current)
    this.index =
      data.current === null ? this.scanners.length : Math.max(0, index)
  }
}
