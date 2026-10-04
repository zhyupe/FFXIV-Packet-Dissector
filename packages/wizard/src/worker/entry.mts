import { execute } from './executor.mjs'
import type { WorkerTask } from '@ffxiv/contracts'
self.onmessage = (event: MessageEvent<ArrayBuffer>) => {
  try {
    const bytes = new Uint8Array(event.data)
    const length = new DataView(event.data).getUint32(0, true)
    if (length > 512 * 1024 || length + 4 > bytes.length)
      throw new Error('INVALID_TASK')
    const task: WorkerTask = JSON.parse(
      new TextDecoder().decode(bytes.subarray(4, 4 + length)),
    )
    self.postMessage(execute(task, bytes.subarray(4 + length)))
  } catch {
    self.postMessage({ error: true })
  }
}
