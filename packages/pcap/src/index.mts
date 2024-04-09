import { EventEmitter } from 'events'
import {
  DeucalionOptions,
  DeucalionPacket,
  ErrorCodes,
  Logger,
} from './interface.mjs'
import { readFileSync } from 'fs'
import { Deucalion } from './deucalion.mjs'
import dllInject from '@ffxiv-teamcraft/dll-inject'
import crypto from 'crypto'
import { exec } from 'child_process'
import { fileURLToPath } from 'url'

const { getPIDByName, injectPID } = dllInject

const logger: Logger = (payload) => console[payload.type](payload.message)
const getDefaultDeucalion = () => {
  return {
    dll: fileURLToPath(new URL('../deucalion/deucalion.dll', import.meta.url)),
    shasum: readFileSync(
      fileURLToPath(
        new URL('../deucalion/deucalion.sha256sum', import.meta.url),
      ),
      'utf-8',
    ).trim(),
  }
}

export class CaptureInterface extends EventEmitter {
  readonly options: DeucalionOptions
  private deucalion?: Deucalion

  constructor(options: DeucalionOptions = getDefaultDeucalion()) {
    super()

    this.options = options
    ;[
      'beforeExit',
      'SIGHUP',
      'SIGINT',
      'SIGQUIT',
      'SIGILL',
      'SIGTRAP',
      'SIGABRT',
      'SIGBUS',
      'SIGFPE',
      'SIGUSR1',
      'SIGSEGV',
      'SIGUSR2',
      'SIGTERM',
    ].forEach((sig) => {
      process.on(sig, (args) => {
        this.stop().then(() => {
          console.error(args)
          process.exit(0)
        })
      })
    })
  }

  async getXIVPIDFromTasklist(): Promise<{ name: string; pid: number } | null> {
    return new Promise<{ name: string; pid: number } | null>(
      (resolve, reject) => {
        exec('tasklist', (err, stdout) => {
          if (err) {
            reject(err)
          }
          resolve(
            stdout
              .split('\n')
              .map((line) => {
                const match = /(ffxiv_dx11.exe)\s+(\d+)/gm.exec(line)
                if (match) {
                  return {
                    name: match[1],
                    pid: +match[2],
                  }
                }
              })
              .find(Boolean) || null,
          )
        })
      },
    )
  }

  async getXIVPID(): Promise<number> {
    const fromInjector = getPIDByName('ffxiv_dx11.exe')
    if (fromInjector > 0) {
      return fromInjector
    } else {
      console.log('Process not found, falling back to tasklist')

      const fromTaskList = await this.getXIVPIDFromTasklist()
      if (fromTaskList) {
        console.log('Found XIV process in tasklist')
        return fromTaskList.pid
      } else {
        throw new Error('GAME_NOT_RUNNING')
      }
    }
  }

  async checkDeucalion() {
    try {
      const buf = readFileSync(this.options.dll)
      const shasum = crypto.createHash('sha256').update(buf).digest('hex')
      if (shasum !== this.options.shasum) {
        throw new Error('Deucalion shasum mismatch')
      }
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        throw new Error(`deucalion.dll not found in ${this.options.dll}`)
      }
    }
  }

  async start(): Promise<void> {
    const pid = await this.getXIVPID()

    await this.checkDeucalion()

    const res = injectPID(pid, this.options.dll)
    if (res !== 0) {
      throw new Error(
        `Dll-inject returned non-zero code: [${res}] ${ErrorCodes[res]}`,
      )
    }

    this.deucalion = new Deucalion(this, logger, pid)
    await this.deucalion.start()
  }

  async stop() {
    if (this.deucalion) {
      await this.deucalion.stop()
    }
  }
}

export interface CaptureInterfaceEvents {
  closed: () => void
  error: (err: Error) => void
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
