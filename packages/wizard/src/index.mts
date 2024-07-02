import { CaptureInterface } from 'pcap'
import { ScannerRunner } from './scanner/scanner.mjs'
import { getScanners } from './scanner/index.mjs'
import { fileURLToPath } from 'url'
;(async () => {
  const runner = new ScannerRunner(getScanners(), {
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

  await capture.start()
})()
