import type { GameProcess } from 'pcap'
import type { WizardSnapshot } from 'wizard/core'
export const PROTOCOL_VERSION = 1
export type Action =
  | 'processes'
  | 'snapshot'
  | 'connect'
  | 'disconnect'
  | 'forwarder'
  | 'wizard.start'
  | 'wizard.select'
  | 'wizard.inputs'
  | 'wizard.skip'
  | 'wizard.stop'
  | 'wizard.save'
  | 'wizard.export'
  | 'shutdown'
export interface Request {
  version: number
  id: string
  sessionId: number
  action: Action
  params?: Record<string, unknown>
}
export interface Snapshot {
  sessionId: number
  connection:
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'disconnecting'
    | 'failed'
  target: GameProcess | null
  forwarder: {
    running: boolean
    clientPort: number
    serverPort: number
    sent: number
    received: number
    dropped: number
    error: string
  }
  wizard: WizardSnapshot | null
  error: string
}
export type Message =
  | {
      version: number
      type: 'response'
      id: string
      sessionId: number
      ok: boolean
      result?: unknown
      error?: string
    }
  | { version: number; type: 'state'; sessionId: number; snapshot: Snapshot }
export const actions: Action[] = [
  'processes',
  'snapshot',
  'connect',
  'disconnect',
  'forwarder',
  'wizard.start',
  'wizard.select',
  'wizard.inputs',
  'wizard.skip',
  'wizard.stop',
  'wizard.save',
  'wizard.export',
  'shutdown',
]
export function parseRequest(value: unknown): Request {
  const r = value as Request
  if (
    !r ||
    r.version !== PROTOCOL_VERSION ||
    typeof r.id !== 'string' ||
    r.id.length > 100 ||
    !Number.isSafeInteger(r.sessionId) ||
    r.sessionId < 0 ||
    !actions.includes(r.action) ||
    (r.params !== undefined &&
      (!r.params || typeof r.params !== 'object' || Array.isArray(r.params)))
  )
    throw new Error('INVALID_REQUEST')
  const p = r.params ?? {}
  if (
    r.action === 'connect' &&
    (!Number.isInteger(p.pid) ||
      Number(p.pid) <= 0 ||
      Number(p.pid) > 0xffffffff ||
      typeof p.startedAt !== 'string' ||
      !/^\d{1,20}$/.test(p.startedAt))
  )
    throw new Error('INVALID_TARGET')
  if (r.action === 'forwarder' && typeof p.enabled !== 'boolean')
    throw new Error('INVALID_INPUT')
  if (
    r.action === 'wizard.select' &&
    (typeof p.name !== 'string' || p.name.length > 128)
  )
    throw new Error('INVALID_STEP')
  if (
    r.action === 'wizard.inputs' &&
    (!Number.isSafeInteger(p.token) ||
      !p.answers ||
      typeof p.answers !== 'object' ||
      Array.isArray(p.answers))
  )
    throw new Error('INVALID_INPUT')
  return r
}
