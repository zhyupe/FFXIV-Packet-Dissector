import type { EventEmitter } from 'node:events'
import { Socket } from 'node:net'
import { setTimeout as delay } from 'node:timers/promises'
import { Origin, type Logger } from '../interface.mjs'
import { DeucalionFramer } from './framing.mjs'

export class Deucalion {
  private socket?: Socket
  private closed = false
  private framer = new DeucalionFramer()
  readonly pipe_path: string
  get running() {
    return !!this.socket && !this.socket.destroyed
  }

  constructor(
    private emitter: EventEmitter,
    private logger: Logger,
    readonly pid: number,
  ) {
    this.pipe_path = `\\\\.\\pipe\\deucalion-${pid}`
  }

  async start(signal?: AbortSignal, attempts = 1): Promise<void> {
    this.closed = false
    for (let attempt = 0; ; attempt++) {
      signal?.throwIfAborted()
      try {
        await this.connect(signal)
        return
      } catch (error) {
        if (
          (error as NodeJS.ErrnoException).code !== 'ENOENT' ||
          attempt + 1 >= attempts
        )
          throw error
        await delay(200, undefined, { signal })
      }
    }
  }

  private connect(signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new Socket()
      this.socket = socket
      const abort = () => fail(new Error('CAPTURE_CANCELLED'))
      const timeout = setTimeout(
        () => fail(new Error('PIPE_CONNECT_TIMEOUT')),
        3000,
      )
      const cleanup = () => {
        clearTimeout(timeout)
        signal?.removeEventListener('abort', abort)
        socket.off('error', fail)
      }
      const fail = (error: Error) => {
        cleanup()
        socket.destroy()
        reject(error)
      }
      signal?.addEventListener('abort', abort, { once: true })
      socket.once('error', fail)
      socket.connect(this.pipe_path, () => {
        cleanup()
        if (signal?.aborted) {
          socket.destroy()
          reject(new Error('CAPTURE_CANCELLED'))
          return
        }
        socket.on('error', () => {
          this.logger({ type: 'error', message: 'PIPE_READ_FAILED' })
          void this.stop()
        })
        socket.on('close', () => {
          this.notifyClosed()
        })
        socket.on('data', (data) => {
          try {
            for (const frame of this.framer.write(data)) this.handle(frame)
          } catch {
            this.logger({ type: 'error', message: 'INVALID_DEUCALION_FRAME' })
            void this.stop()
          }
        })
        const options = Buffer.alloc(9)
        options.writeUInt32LE(9)
        options[4] = 5
        options.writeUInt32LE((1 << 1) | (1 << 4), 5)
        socket.write(options)
        resolve()
      })
    })
  }

  private handle(frame: Buffer) {
    const operation = frame[4]
    if (operation !== 3 && operation !== 4) return // Do not forward DLL debug text.
    if (frame.readUInt32LE(5) !== 1) return
    const data = frame.subarray(9)
    if (data.length < 32) throw new Error('SHORT_IPC_HEADER')
    this.emitter.emit('packet', {
      origin: operation === 3 ? Origin.Server : Origin.Client,
      header: {
        sourceActor: data.readUInt32LE(0),
        targetActor: data.readUInt32LE(4),
        ipcTimestamp: data.readBigUInt64LE(8),
        reserved: data.readInt16LE(16),
        type: data.readUInt16LE(18),
        padding: data.readInt16LE(20),
        serverId: data.readUInt16LE(22),
        timestamp: data.readUInt32LE(24),
        padding1: data.readUInt32LE(28),
      },
      data: data.subarray(32),
    })
  }

  private notifyClosed() {
    if (this.closed) return
    this.closed = true
    this.framer.clear()
    this.emitter.emit('closed')
  }

  async stop() {
    const socket = this.socket
    this.socket = undefined
    if (socket && !socket.destroyed) {
      await new Promise<void>((resolve) => {
        socket.once('close', resolve)
        socket.destroy()
      })
    }
    this.notifyClosed()
  }
}
