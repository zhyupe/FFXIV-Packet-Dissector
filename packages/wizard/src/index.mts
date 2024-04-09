import { CaptureInterface } from 'pcap'
import { ScannerRunner } from './scanner/scanner.mjs'
import { getScanners } from './scanner/index.mjs'
import { fileURLToPath } from 'url'
;(async () => {
  const capture = new CaptureInterface()
  const runner = new ScannerRunner(getScanners(), {
    outDir: fileURLToPath(new URL('../out', import.meta.url)),
    onFinish: () => {
      capture.stop()
    },
  })

  capture.on('packet', (packet) => {
    runner.write(packet)
  })

  capture.on('closed', () => {
    runner.output()
  })

  await capture.start()
})()
