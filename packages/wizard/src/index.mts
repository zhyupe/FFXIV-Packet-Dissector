import { emitKeypressEvents } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { CaptureInterface } from 'pcap'
import { getGameVersion } from './game.mjs'
import { getScanners } from './scanner/index.mjs'
import { ScannerRunner } from './scanner/scanner.mjs'

;(async () => {
  const version = getGameVersion() ?? 'unk'
  console.log('Version', version)
  const runner = new ScannerRunner(getScanners(), {
    version,
    outDir: fileURLToPath(new URL('../out', import.meta.url)),
    onFinish: () => {
      capture?.stop()
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

  // listen key press
  emitKeypressEvents(process.stdin)
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.on('keypress', (str, key) => {
    if (key.ctrl) {
      switch (key.name) {
        case 'c': // ctrl-c
          capture.stop().then(() => {
            process.exit()
          })
          break
        case 's':
          runner.output()
          break
        case 'd':
          runner.next()
          break
      }
    }
  })

  await capture.start()
})()
