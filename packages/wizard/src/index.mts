import { emitKeypressEvents } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { CaptureInterface } from 'pcap'
import { getGameVersion } from './game.mjs'
import { getScanners } from './scanner/index.mjs'
import { ScannerRunner } from './scanner/scanner.mjs'

;(async () => {
  const version = getGameVersion() ?? 'unk'
  console.log('Version', version)
  let promptActive = false
  const runner = new ScannerRunner(getScanners(), {
    version,
    outDir: fileURLToPath(new URL('../out', import.meta.url)),
    onFinish: () => {
      capture?.stop()
    },
    onPromptStateChange: (active) => {
      promptActive = active
    },
  })

  if (runner.finished) {
    runner.output()
    return
  }

  const capture = new CaptureInterface()
  capture.on('packet', (packet) => {
    runner.write(packet)
  })

  capture.on('closed', () => {
    runner.output()
  })

  const stop = () => {
    runner.stop()
  }

  const skip = () => {
    runner.skip()
  }

  const write = () => {
    runner.output()
  }

  const isFunctionKey = (key: { name?: string }) =>
    key.name === 'f6' || key.name === 'f7' || key.name === 'f8'

  console.log('Controls: F6 skip, F7 write, F8 stop')

  emitKeypressEvents(process.stdin)
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
  }
  process.stdin.resume()
  process.stdin.on('keypress', (_str, key) => {
    if (promptActive) {
      return
    }

    switch (key.name) {
      case 'f6':
        skip()
        break
      case 'f7':
        write()
        break
      case 'f8':
        stop()
        break
    }
  })

  await capture.start()
})()
