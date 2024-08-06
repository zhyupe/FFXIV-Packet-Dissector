import { DeucalionPacket } from 'pcap'
import { hex } from './helper.mjs'
import { Writable } from 'stream'
import { Scanner } from './interface.mjs'
import { StateManager } from './state.mjs'

export class ScannerRunner extends Writable {
  #state: StateManager
  public get finished() {
    return this.#state.finished
  }

  constructor(
    scanners: Scanner[],
    private options: {
      outDir: string
      onFinish: () => void
    },
  ) {
    super({
      objectMode: true,
    })

    this.#state = new StateManager(scanners, options.outDir)
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
