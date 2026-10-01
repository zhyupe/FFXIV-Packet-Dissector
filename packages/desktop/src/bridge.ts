import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
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
}
const native: Bridge = {
  request: (action, params, sessionId) =>
    invoke('service_request', { action, params, sessionId }),
  export: (sessionId) => invoke('export_results', { sessionId }),
  subscribe: async (handler, failed) => {
    const cleanups = await Promise.all([
      listen<Snapshot>('service-state', (event) => handler(event.payload)),
      listen('backend-exited', () => failed('BACKEND_EXITED')),
      listen<string>('service-error', (event) => failed(event.payload)),
    ])
    return () => cleanups.forEach((cleanup) => cleanup())
  },
}
// Test-only injection is excluded from production builds by Vite.
export const bridge =
  (import.meta.env.DEV &&
    (window as Window & { __DESKTOP_TEST_BRIDGE__?: Bridge })
      .__DESKTOP_TEST_BRIDGE__) ||
  native
