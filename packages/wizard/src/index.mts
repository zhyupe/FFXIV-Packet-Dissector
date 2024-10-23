import { CaptureInterface } from 'pcap'
import { ScannerRunner } from './scanner/scanner.mjs'
import { getScanners } from './scanner/index.mjs'
import { fileURLToPath } from 'url'
import { getGameVersion } from './game.mjs'
import { emitKeypressEvents } from 'readline'
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
    switch (str) {
      case '\u0003': // ctrl-c
        capture.stop().then(() => {
          process.exit()
        })
        break
      case 'w':
        runner.output()
        break
      case 's':
        runner.next()
        break
    }
  })

  await capture.start()
})()
