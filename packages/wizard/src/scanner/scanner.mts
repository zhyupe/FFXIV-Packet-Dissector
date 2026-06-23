import { Writable } from 'node:stream'
import type { DeucalionPacket } from 'pcap'
import type { Scanner } from './interface.mjs'
import { StateManager, type StateOptions } from './state.mjs'

export class ScannerRunner extends Writable {
  #state: StateManager
  #promise: Promise<any> | null = null
  #finishedNotified = false

  public get finished() {
    return this.#state.finished
  }

  constructor(
    scanners: Scanner[],
    private options: StateOptions & {
      onFinish: () => void
    },
  ) {
    super({
      objectMode: true,
    })

    this.#state = new StateManager(scanners, options)
  }

  #notifyFinished() {
    if (this.#finishedNotified) {
      return
    }

    this.#finishedNotified = true
    this.options.onFinish()
  }

  async _write(
    packet: DeucalionPacket,
    _: any,
    callback: (error?: Error) => void,
  ) {
    if (this.finished) {
      this.#notifyFinished()
      return callback()
    }

    // console.debug(
    //   '# %s origin %s dataLength %s',
    //   format(opcode),
    //   packet.origin,
    //   packet.data.length,
    // )

    const ret = await this.#state.handle(packet)

    if (ret === true) {
      await this.next()
    } else if (this.finished) {
      this.#notifyFinished()
    }

    if (this.#promise) {
      await this.#promise
    }

    return callback()
  }

  output() {
    this.#state.output()
  }

  skip() {
    this.#state.skip()
  }

  stop() {
    this.#state.stop()
    this.#notifyFinished()
  }

  async next() {
    this.#promise = this.#state.nextScanner()
    await this.#promise
    this.#promise = null
  }
}
