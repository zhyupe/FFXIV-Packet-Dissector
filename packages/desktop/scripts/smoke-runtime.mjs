import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, cp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

const desktop = fileURLToPath(new URL('..', import.meta.url))
const temporary = await mkdtemp(join(tmpdir(), 'ffxiv-runtime-'))
const root = join(temporary, '运行 环境')
await cp(
  resolve(process.argv[2] ?? join(desktop, 'src-tauri/resources')),
  root,
  { recursive: true },
)
const child = spawn(
  join(root, 'node.exe'),
  [join(root, 'service.mjs'), root, join(temporary, 'state')],
  {
    env: { ...process.env, PATH: '', NODE_OPTIONS: '', NODE_PATH: '' },
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  },
)
const timeout = setTimeout(() => {
  child.kill()
}, 15000)
const lines = createInterface({ input: child.stdout })
let step = 0
let complete = false
const request = (action) =>
  child.stdin.write(
    `${JSON.stringify({ version: 1, id: String(++step), sessionId: 0, action })}\n`,
  )
request('processes')
try {
  for await (const line of lines) {
    const message = JSON.parse(line)
    assert.equal(message.version, 1)
    if (message.type !== 'response') continue
    assert.equal(message.ok, true)
    if (message.id === '1') {
      assert(Array.isArray(message.result))
      request('snapshot')
    } else if (message.id === '2') {
      assert.equal(message.result.connection, 'disconnected')
      request('shutdown')
    } else if (message.id === '3') {
      complete = true
      child.stdin.end()
    }
  }
  const exit = await new Promise((resolve) =>
    child.exitCode !== null
      ? resolve(child.exitCode)
      : child.once('exit', resolve),
  )
  assert.equal(exit, 0)
  assert(complete)
  console.log(
    'Runtime smoke passed: native module, process enumeration, protocol, shutdown, Unicode path, empty PATH.',
  )
} finally {
  clearTimeout(timeout)
  child.kill()
  await rm(temporary, { recursive: true, force: true })
}
