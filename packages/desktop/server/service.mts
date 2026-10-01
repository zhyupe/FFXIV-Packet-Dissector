import { EventEmitter } from 'node:events'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import {
  CaptureInterface,
  getGameProcesses,
  validateTarget,
  type DeucalionOptions,
  type DeucalionPacket,
} from 'pcap'
import { Forwarder } from 'forwarder/core'
import { WizardEngine, getScanners, SCANNER_REVISION } from 'wizard/core'
import {
  parseRequest,
  type Request,
  type Snapshot,
} from '../shared/protocol.js'

interface Capture extends EventEmitter {
  start(target: { pid: number; startedAt: string }): Promise<void>
  stop(): Promise<void>
}
export interface ServiceDependencies {
  processes: typeof getGameProcesses
  validate: typeof validateTarget
  capture: () => Capture
  forwarder: () => Forwarder
  wizard: (path: string) => WizardEngine
}
export class DesktopService extends EventEmitter {
  private capture?: Capture
  private forwarder: Forwarder
  private wizard?: WizardEngine
  private queue: Promise<unknown> = Promise.resolve()
  private interval: NodeJS.Timeout
  state: Snapshot = {
    sessionId: 0,
    connection: 'disconnected',
    target: null,
    forwarder: {
      running: false,
      clientPort: 0,
      serverPort: 0,
      sent: 0,
      received: 0,
      dropped: 0,
      error: '',
    },
    wizard: null,
    error: '',
  }
  constructor(
    private dataDir: string,
    options: DeucalionOptions,
    private deps: ServiceDependencies = {
      processes: getGameProcesses,
      validate: validateTarget,
      capture: () => new CaptureInterface(options),
      forwarder: () => new Forwarder(),
      wizard: (path) => new WizardEngine(getScanners(), path),
    },
  ) {
    super()
    this.forwarder = deps.forwarder()
    this.forwarder.on('changed', () => this.publish())
    this.interval = setInterval(() => {
      if (this.state.connection === 'connected') this.publish()
    }, 500)
    this.interval.unref()
  }
  snapshot(): Snapshot {
    return {
      ...this.state,
      forwarder: { ...this.forwarder.status },
      wizard: this.wizard?.snapshot() ?? null,
    }
  }
  private publish() {
    this.emit('state', this.snapshot())
  }
  execute(input: unknown): Promise<unknown> {
    const request = parseRequest(input)
    // Cancellation must not wait behind a connection attempt in the command queue.
    if (
      this.state.connection === 'connecting' &&
      ['disconnect', 'shutdown'].includes(request.action) &&
      request.sessionId === this.state.sessionId
    )
      void this.capture?.stop()
    const result = this.queue.then(() => this.dispatch(request))
    this.queue = result.catch(() => {})
    return result
  }
  private async dispatch(r: Request): Promise<unknown> {
    if (r.action === 'snapshot') return this.snapshot()
    if (r.action === 'processes') return this.deps.processes()
    if (r.sessionId !== this.state.sessionId) throw new Error('STALE_SESSION')
    const p = r.params ?? {}
    switch (r.action) {
      case 'connect': {
        await this.disconnect()
        const target = this.deps.validate({
          pid: Number(p.pid),
          startedAt: String(p.startedAt),
        })
        this.state.sessionId++
        this.state.connection = 'connecting'
        this.state.target = target
        this.state.error = ''
        const capture = (this.capture = this.deps.capture())
        const session = this.state.sessionId
        this.publish()
        capture.on('packet', (packet: DeucalionPacket) => {
          if (
            session !== this.state.sessionId ||
            this.state.connection !== 'connected'
          )
            return
          this.forwarder.write(packet)
          this.wizard?.write(packet)
        })
        capture.on('closed', () => {
          if (
            session !== this.state.sessionId ||
            this.state.connection !== 'connected'
          )
            return
          void this.execute({
            version: 1,
            id: 'pipe-closed',
            sessionId: session,
            action: 'disconnect',
          }).catch(() => {})
        })
        try {
          await capture.start(target)
          const profile = createHash('sha256')
            .update(
              `${target.executable.toLowerCase()}\0${target.version}\0${SCANNER_REVISION}`,
            )
            .digest('hex')
          this.wizard = this.deps.wizard(
            join(this.dataDir, 'wizard', profile, 'state.json'),
          )
          this.wizard.on('changed', () => this.publish())
          this.state.connection = 'connected'
        } catch (error) {
          await capture.stop()
          capture.removeAllListeners()
          this.capture = undefined
          this.state.connection = 'failed'
          this.state.error =
            error instanceof Error &&
            ['STATE_READ_FAILED', 'INVALID_STATE'].includes(error.message)
              ? error.message
              : 'CONNECT_FAILED'
          this.publish()
          throw new Error(this.state.error)
        }
        break
      }
      case 'disconnect':
        await this.disconnect()
        break
      case 'shutdown':
        await this.disconnect()
        clearInterval(this.interval)
        break
      case 'wizard.export':
        return this.wizard?.exportResults() ?? []
      case 'wizard.save':
        this.wizard?.save()
        this.state.error = ''
        break
      default: {
        if (this.state.connection !== 'connected' || !this.wizard)
          throw new Error('NOT_CONNECTED')
        switch (r.action) {
          case 'forwarder':
            if (p.enabled) await this.forwarder.start()
            else await this.forwarder.stop()
            break
          case 'wizard.start':
            this.wizard.start()
            break
          case 'wizard.select':
            this.wizard.selectStep(String(p.name))
            break
          case 'wizard.inputs':
            this.wizard.submitInputs(
              Number(p.token),
              p.answers as Record<string, string | number>,
            )
            break
          case 'wizard.skip':
            this.wizard.skip()
            break
          case 'wizard.stop':
            this.wizard.stop()
            break
        }
      }
    }
    this.publish()
    return this.snapshot()
  }
  private async disconnect() {
    this.state.connection = 'disconnecting'
    this.publish()
    let saveFailed = false
    try {
      this.wizard?.stop(true)
    } catch {
      saveFailed = true
    }
    await this.forwarder.stop()
    const capture = this.capture
    this.capture = undefined
    await capture?.stop()
    capture?.removeAllListeners()
    this.state.connection = 'disconnected'
    if (saveFailed) {
      this.state.error = 'SAVE_FAILED'
      this.publish()
      throw new Error('SAVE_FAILED')
    }
  }
}
