import { invoke, Channel } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { WorkerClient } from './worker-client'
import type { Action, Snapshot } from '../shared/protocol'
export interface Bridge {
  request(
    action: Action,
    params: Record<string, unknown>,
    sessionId: number,
  ): Promise<unknown>
  subscribe(
    handler: (state: Snapshot) => void,
    failed: (code: string) => void,
  ): Promise<() => void>
  export(sessionId: number): Promise<boolean>
  openWireshark?(): Promise<void>
}
const native: Bridge = {
  request: (action, params, sessionId) =>
    invoke('service_request', { action, params, sessionId }),
  export: (sessionId) => invoke('export_results', { sessionId }),
  openWireshark: () => invoke('open_wireshark'),
  subscribe: async (handler, failed) => {
    const worker = new WorkerClient((action, params, sessionId) =>
      invoke('service_request', { action, params, sessionId }),
    )
    const channel = new Channel<ArrayBuffer>()
    channel.onmessage = (buffer) => worker.receive(buffer)
    await invoke('attach_worker', { channel })
    const cleanups = await Promise.all([
      listen<Snapshot>('service-state', (event) => {
        worker.state(event.payload)
        handler(event.payload)
      }),
      listen<string>('service-error', (event) => failed(event.payload)),
    ])
    return () => {
      worker.dispose()
      cleanups.forEach((cleanup) => cleanup())
    }
  },
}
// Test-only injection is excluded from production builds by Vite.
export const bridge =
  (import.meta.env.DEV &&
    (window as Window & { __DESKTOP_TEST_BRIDGE__?: Bridge })
      .__DESKTOP_TEST_BRIDGE__) ||
  native
