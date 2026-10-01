import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { DesktopService } from './service.mjs'
import {
  PROTOCOL_VERSION,
  parseRequest,
  type Message,
} from '../shared/protocol.js'

// Only the Rust host supplies these paths. No runtime inputs or packet data are logged.
const [resourceDir, dataDir] = process.argv.slice(2)
if (!resourceDir || !dataDir) process.exit(2)
const root = resolve(resourceDir)
const service = new DesktopService(resolve(dataDir), {
  dll: join(root, 'deucalion.dll'),
  shasum: readFileSync(join(root, 'deucalion.sha256sum'), 'utf8').trim(),
})
let ending = false
let pending = ''
let outstanding = 0
const send = (message: Message) => {
  if (process.stdout.writableLength > 2 * 1024 * 1024) {
    void shutdown()
    return
  }
  process.stdout.write(`${JSON.stringify(message)}\n`)
}
service.on('state', (snapshot) =>
  send({
    version: PROTOCOL_VERSION,
    type: 'state',
    sessionId: snapshot.sessionId,
    snapshot,
  }),
)
async function shutdown() {
  if (ending) return
  ending = true
  try {
    await service.execute({
      version: 1,
      id: 'shutdown',
      sessionId: service.state.sessionId,
      action: 'shutdown',
    })
  } catch {
    process.exitCode = 1
  } finally {
    process.stdin.destroy()
    process.stdout.end(() => process.exit(process.exitCode ?? 0))
  }
}
function handle(line: string) {
  let raw: any
  try {
    raw = JSON.parse(line)
    const request = parseRequest(raw)
    if (++outstanding > 64) {
      void shutdown()
      return
    }
    void service
      .execute(request)
      .then(
        (result) => {
          send({
            version: 1,
            type: 'response',
            id: request.id,
            sessionId: service.state.sessionId,
            ok: true,
            result,
          })
          if (request.action === 'shutdown') void shutdown()
        },
        (error) => {
          // Only fixed error codes reach the GUI; never echo user inputs or exception text.
          const code =
            error instanceof Error && /^[A-Z_]+$/.test(error.message)
              ? error.message
              : 'COMMAND_FAILED'
          send({
            version: 1,
            type: 'response',
            id: request.id,
            sessionId: service.state.sessionId,
            ok: false,
            error: code,
          })
        },
      )
      .finally(() => {
        outstanding--
      })
  } catch {
    send({
      version: 1,
      type: 'response',
      id: typeof raw?.id === 'string' && raw.id.length <= 100 ? raw.id : '',
      sessionId: service.state.sessionId,
      ok: false,
      error: 'INVALID_REQUEST',
    })
  }
}
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk: string) => {
  pending += chunk
  if (pending.length > 1024 * 1024) {
    void shutdown()
    return
  }
  let newline: number
  while ((newline = pending.indexOf('\n')) >= 0) {
    const line = pending.slice(0, newline)
    pending = pending.slice(newline + 1)
    if (line.trim()) handle(line)
  }
})
process.stdin.on('end', () => void shutdown())
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => void shutdown())
process.on('uncaughtException', () => void shutdown())
process.on('unhandledRejection', () => void shutdown())
