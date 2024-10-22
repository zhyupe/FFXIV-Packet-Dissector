import { DeucalionPacket } from 'pcap'
import { Writable } from 'stream'
import { Scanner } from './interface.mjs'
import { StateManager, StateOptions } from './state.mjs'

export class ScannerRunner extends Writable {
  #state: StateManager
  #promise: Promise<any> | null = null

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

  async _write(
    packet: DeucalionPacket,
    _: any,
    callback: (error?: Error) => void,
  ) {
    if (this.finished) {
      this.options.onFinish()
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
      await this.#state.nextScanner()
    } else if (this.finished) {
      this.options.onFinish()
    }

    return callback()
  }

  output() {
    this.#state.output()
  }
}
