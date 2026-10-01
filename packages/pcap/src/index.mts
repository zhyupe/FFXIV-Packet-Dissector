import { EventEmitter } from 'node:events'
import { Deucalion } from './deucalion/protocol.mjs'
import { getDefaultDeucalion, verifyDeucalion } from './deucalion/utils.mjs'
import type { DeucalionOptions, DeucalionPacket, Logger } from './interface.mjs'
import {
  getGameProcesses,
  injectDll,
  validateTarget,
  type GameProcess,
} from './process.mjs'

export interface CaptureDependencies {
  processes: typeof getGameProcesses
  validate: typeof validateTarget
  inject: typeof injectDll
  create: (
    emitter: EventEmitter,
    logger: Logger,
    pid: number,
  ) => Pick<Deucalion, 'start' | 'stop'>
}
const dependencies: CaptureDependencies = {
  processes: getGameProcesses,
  validate: validateTarget,
  inject: injectDll,
  create: (emitter, logger, pid) => new Deucalion(emitter, logger, pid),
}

export class CaptureInterface extends EventEmitter {
  private deucalion?: Pick<Deucalion, 'start' | 'stop'>
  private controller?: AbortController
  private starting?: Promise<void>
  private stopping?: Promise<void>
  constructor(
    private options: DeucalionOptions = getDefaultDeucalion(),
    private deps = dependencies,
    private logger: Logger = () => {},
  ) {
    super()
  }

  start(target?: Pick<GameProcess, 'pid' | 'startedAt'>): Promise<void> {
    if (this.stopping) return Promise.reject(new Error('CAPTURE_STOPPING'))
    if (this.starting) return this.starting
    if (this.deucalion) return Promise.reject(new Error('ALREADY_CONNECTED'))
    this.controller = new AbortController()
    const signal = this.controller.signal
    this.starting = this.open(target, signal).finally(() => {
      this.starting = undefined
    })
    return this.starting
  }

  private async open(
    target: Pick<GameProcess, 'pid' | 'startedAt'> | undefined,
    signal: AbortSignal,
  ) {
    verifyDeucalion(this.options)
    const selected = target ?? this.deps.processes()[0]
    if (!selected) throw new Error('GAME_NOT_RUNNING')
    this.deps.validate(selected)
    const connection = this.deps.create(this, this.logger, selected.pid)
    this.deucalion = connection
    try {
      try {
        await connection.start(signal)
      } catch (error) {
        signal.throwIfAborted()
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        this.deps.validate(selected)
        await this.deps.inject(selected.pid, this.options.dll)
        signal.throwIfAborted()
        await connection.start(signal, 15)
      }
      signal.throwIfAborted()
    } catch (error) {
      await connection.stop()
      if (this.deucalion === connection) this.deucalion = undefined
      throw error
    }
  }

  stop(): Promise<void> {
    if (this.stopping) return this.stopping
    this.controller?.abort()
    this.stopping = (async () => {
      await this.starting?.catch(() => {})
      const connection = this.deucalion
      this.deucalion = undefined
      await connection?.stop()
    })().finally(() => {
      this.stopping = undefined
    })
    return this.stopping
  }
}
export interface CaptureInterfaceEvents {
  closed: () => void
  error: (error: Error) => void
  packet: (packet: DeucalionPacket) => void
}
export declare interface CaptureInterface {
  on<U extends keyof CaptureInterfaceEvents>(
    event: U,
    listener: CaptureInterfaceEvents[U],
  ): this
  emit<U extends keyof CaptureInterfaceEvents>(
    event: U,
    ...args: Parameters<CaptureInterfaceEvents[U]>
  ): boolean
}
export * from './interface.mjs'
export * from './process.mjs'
