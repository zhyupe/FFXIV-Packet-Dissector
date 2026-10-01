import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { test } from 'node:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Origin, type DeucalionPacket } from 'pcap'
import { WizardEngine } from 'wizard/core'
import { Forwarder } from 'forwarder/core'
import { DesktopService } from '../server/service.mjs'
import { parseRequest, type Action } from '../shared/protocol.js'
const target = {
  pid: 123,
  startedAt: '456',
  executable: 'C:\\Synthetic\\ffxiv_dx11.exe',
  version: 'synthetic',
}
class Capture extends EventEmitter {
  stops = 0
  async start() {}
  async stop() {
    this.stops++
    this.emit('closed')
  }
}
class MockForwarder extends Forwarder {
  override async start() {
    this.status.running = true
  }
  override async stop() {
    this.status.running = false
  }
  override write() {
    if (this.status.running) this.status.sent++
  }
}
function fixture(t: { after(fn: () => void | Promise<void>): void }) {
  const dir = mkdtempSync(join(tmpdir(), 'desktop-test-'))
  const captures: Capture[] = []
  const service = new DesktopService(
    dir,
    { dll: '', shasum: '' },
    {
      processes: () => [target],
      validate: (p) => {
        if (p.pid !== target.pid || p.startedAt !== target.startedAt)
          throw new Error('PROCESS_CHANGED_OR_EXITED')
        return target
      },
      capture: () => {
        const capture = new Capture()
        captures.push(capture)
        return capture
      },
      forwarder: () => new MockForwarder(),
      wizard: (path) =>
        new WizardEngine(
          [
            {
              name: 'SyntheticStep',
              instruction: 'Synthetic instruction',
              fields: [
                { key: 'text', label: 'Input', type: 'text', required: true },
              ],
              source: Origin.Server,
              handler: () => ({}),
            },
          ],
          path,
        ),
    },
  )
  const run = (
    action: Action,
    params: Record<string, unknown> = {},
    sessionId = service.state.sessionId,
  ) => service.execute({ version: 1, id: 'test', action, params, sessionId })
  t.after(async () => {
    await run('shutdown')
    rmSync(dir, { recursive: true, force: true })
  })
  return { service, captures, run }
}
const packet = {
  origin: Origin.Server,
  header: { type: 123 },
  data: Buffer.alloc(16),
} as DeucalionPacket

test('shared capture fans out without blocking on a wizard form; switches clear inputs and stop both', async (t) => {
  const { service, captures, run } = fixture(t)
  await run('connect', target)
  await run('forwarder', { enabled: true })
  await run('wizard.start')
  captures[0].emit('packet', packet)
  assert.equal(service.snapshot().forwarder.sent, 1)
  assert.equal(service.snapshot().wizard?.status, 'input')
  await run('wizard.inputs', {
    token: service.snapshot().wizard?.inputToken,
    answers: { text: 'Synthetic input' },
  })
  captures[0].emit('packet', packet)
  assert.equal(service.snapshot().wizard?.results.length, 1)
  await run('wizard.stop')
  captures[0].emit('packet', packet)
  assert.equal(service.snapshot().forwarder.sent, 3)
  const oldSession = service.state.sessionId
  await run('connect', target)
  assert.equal(captures.length, 2)
  assert(captures[0].stops > 0)
  assert.equal(service.snapshot().forwarder.running, false)
  assert.equal(service.snapshot().wizard?.status, 'idle')
  assert.equal(service.snapshot().wizard?.results.length, 1)
  await assert.rejects(run('wizard.start', {}, oldSession), /STALE_SESSION/)
  await run('wizard.select', { name: 'SyntheticStep' })
  assert.equal(service.snapshot().wizard?.status, 'input')
  captures[0].emit('packet', packet)
  assert.equal(service.snapshot().wizard?.status, 'input')
})
test('forwarder stop does not stop wizard; process mismatch prevents capture', async (t) => {
  const { service, captures, run } = fixture(t)
  await assert.rejects(
    run('connect', { ...target, startedAt: '789' }),
    /PROCESS_CHANGED_OR_EXITED/,
  )
  assert.equal(captures.length, 0)
  await run('connect', target)
  await run('wizard.start')
  await run('forwarder', { enabled: false })
  assert.equal(service.snapshot().wizard?.status, 'input')
  await run('disconnect')
  assert.equal(service.snapshot().connection, 'disconnected')
})
test('wire boundary rejects incompatible protocols and arbitrary commands', () => {
  const request = { version: 1, id: 'x', sessionId: 0, action: 'snapshot' }
  assert.equal(parseRequest(request).action, 'snapshot')
  for (const changes of [
    { version: 2 },
    { action: 'shell' },
    { sessionId: -1 },
    { id: {} },
    { action: 'connect', params: { pid: -1, startedAt: '1' } },
    { action: 'wizard.inputs', params: { token: 1, answers: [] } },
  ])
    assert.throws(() => parseRequest({ ...request, ...changes }))
})

test('disconnect cancels an in-flight connection before waiting for the command queue', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'desktop-cancel-'))
  let rejectStart: (error: Error) => void = () => {}
  let notifyStarted: () => void = () => {}
  const started = new Promise<void>((resolve) => {
    notifyStarted = resolve
  })
  class SlowCapture extends Capture {
    override async start() {
      notifyStarted()
      await new Promise<void>((_, reject) => {
        rejectStart = reject
      })
    }
    override async stop() {
      rejectStart(new Error('CAPTURE_CANCELLED'))
      await super.stop()
    }
  }
  const service = new DesktopService(
    dir,
    { dll: '', shasum: '' },
    {
      processes: () => [target],
      validate: () => target,
      capture: () => new SlowCapture(),
      forwarder: () => new MockForwarder(),
      wizard: () => new WizardEngine([]),
    },
  )
  const run = (action: Action, params = {}) =>
    service.execute({
      version: 1,
      id: action,
      sessionId: service.state.sessionId,
      action,
      params,
    })
  t.after(async () => {
    await run('shutdown')
    rmSync(dir, { recursive: true, force: true })
  })
  const connecting = run('connect', target)
  const rejected = assert.rejects(connecting, /CONNECT_FAILED/)
  await started
  await run('disconnect')
  await rejected
  assert.equal(service.snapshot().connection, 'disconnected')
})

test('pipe closure disconnects once without recursively stopping the capture', async (t) => {
  const { service, captures, run } = fixture(t)
  await run('connect', target)
  captures[0].emit('closed')
  await run('snapshot')
  assert.equal(service.snapshot().connection, 'disconnected')
  assert.equal(captures[0].stops, 1)
})
