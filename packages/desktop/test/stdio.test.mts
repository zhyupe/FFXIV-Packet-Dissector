import assert from 'node:assert/strict'
import { test } from 'node:test'
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'

// Exercises the actual packaged service entrypoint, with no injection or live game.
test(
  'stdio accepts split commands, rejects versions and exits on parent EOF',
  { timeout: 15000 },
  async (t) => {
    const dir = mkdtempSync(join(tmpdir(), 'desktop-stdio-'))
    writeFileSync(join(dir, 'deucalion.sha256sum'), '0'.repeat(64))
    const child = spawn(
      process.execPath,
      [resolve('dist-service/service.mjs'), dir, join(dir, 'state')],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_TEST_CONTEXT: '', NODE_OPTIONS: '' },
      },
    )
    const exit = new Promise<number | null>((resolve) =>
      child.once('exit', resolve),
    )
    t.after(async () => {
      child.kill()
      await exit
      rmSync(dir, { recursive: true, force: true })
    })
    const responses: any[] = []
    let diagnostics = ''
    child.stderr.on('data', (data) => {
      diagnostics += data
    })
    const lines = createInterface({ input: child.stdout })
    const completed = new Promise<void>((resolve, reject) => {
      child.once('error', reject)
      child.once('exit', (code) => {
        if (responses.length < 3)
          reject(
            new Error(
              `Early service exit ${code}: ${diagnostics}; received ${responses.length} replies`,
            ),
          )
      })
      lines.on('line', (line) => {
        const message = JSON.parse(line)
        if (message.type === 'response') {
          responses.push(message)
          if (responses.length === 3) resolve()
        }
      })
    })
    const a = `${JSON.stringify({ version: 1, id: 'a', sessionId: 0, action: 'snapshot' })}\n`
    child.stdin.write(a.slice(0, 13))
    child.stdin.write(a.slice(13))
    child.stdin.write(
      `${JSON.stringify({ version: 2, id: 'b', sessionId: 0, action: 'snapshot' })}\n${JSON.stringify({ version: 1, id: 'c', sessionId: 0, action: 'processes' })}\n`,
    )
    await completed
    assert.equal(
      responses.find((r) => r.id === 'a').result.connection,
      'disconnected',
    )
    assert.equal(responses.find((r) => r.id === 'b').error, 'INVALID_REQUEST')
    assert(Array.isArray(responses.find((r) => r.id === 'c').result))
    child.stdin.end()
    assert.equal(await exit, 0, diagnostics)
  },
)
