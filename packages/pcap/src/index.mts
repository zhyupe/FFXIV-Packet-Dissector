import { EventEmitter } from 'events'
import {
  DeucalionOptions,
  DeucalionPacket,
  Logger,
} from './interface.mjs'
import { Deucalion } from './deucalion/protocol.mjs'
import { getXIVPID, injectDll } from './process.mjs'
import { getDefaultDeucalion, listenAbortEvents, verifyDeucalion } from './deucalion/utils.mjs'


const logger: Logger = (payload) => console[payload.type](payload.message)


export class CaptureInterface extends EventEmitter {
  private deucalion?: Deucalion

  constructor(private readonly options: DeucalionOptions = getDefaultDeucalion()) {
    super()

    verifyDeucalion(options)

    this.options = options
    listenAbortEvents((...args) => {
      this.stop().then(() => {
        console.error(args)
        process.exit(0)
      })
    })
  }

  async start(): Promise<void> {
    const pid = await getXIVPID()

    await injectDll(pid, this.options.dll)

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
