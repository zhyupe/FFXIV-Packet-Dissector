import { CaptureInterface } from 'pcap'
import { Forwarder } from './forwarder.mjs'

const capture = new CaptureInterface()
const forwarder = new Forwarder()
let stopping = false
async function stop() {
  if (stopping) return
  stopping = true
  await forwarder.stop()
  await capture.stop()
}
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => void stop())
capture.on('packet', (packet) => forwarder.write(packet))
capture.on('closed', () => void stop())
capture.on('error', () => void stop())
try {
  await forwarder.start()
  await capture.start()
} catch {
  console.error(
    'Forwarder could not start. Check the game process and injection permissions.',
  )
  await stop()
  process.exitCode = 1
}
