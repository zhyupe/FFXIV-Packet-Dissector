import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash } from 'node:crypto'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CaptureInterface, type CaptureDependencies } from '../src/index.mjs'
import { DeucalionFramer } from '../src/deucalion/framing.mjs'
import { verifyDeucalion } from '../src/deucalion/utils.mjs'

const target = {
  pid: 123,
  startedAt: '456',
  executable: 'C:\\Synthetic\\ffxiv_dx11.exe',
  version: 'synthetic',
}
function fixture(t: { after(fn: () => void): void }) {
  const directory = mkdtempSync(join(tmpdir(), 'capture-test-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const dll = join(directory, 'test.dll')
  const data = Buffer.from('synthetic library')
  writeFileSync(dll, data)
  return { dll, shasum: createHash('sha256').update(data).digest('hex') }
}
function frame(payload: number) {
  const data = Buffer.alloc(9 + payload, 0xa5)
  data.writeUInt32LE(data.length)
  return data
}
test('framer joins every possible split and separates coalesced frames', () => {
  const bytes = Buffer.concat([frame(0), frame(24), frame(3)])
  for (let split = 1; split < bytes.length; split++) {
    const framer = new DeucalionFramer()
    assert.deepEqual(
      [
        ...framer.write(bytes.subarray(0, split)),
        ...framer.write(bytes.subarray(split)),
      ],
      [frame(0), frame(24), frame(3)],
    )
  }
  const f = new DeucalionFramer()
  assert.deepEqual(
    [...bytes].flatMap((byte) => f.write(Buffer.from([byte]))),
    [frame(0), frame(24), frame(3)],
  )
})
test('framer rejects impossible lengths and clears partial state', () => {
  const f = new DeucalionFramer()
  assert.throws(() => f.write(Buffer.alloc(4)), /INVALID_DEUCALION_FRAME/)
  const huge = Buffer.alloc(4)
  huge.writeUInt32LE(0xffffffff)
  assert.throws(() => f.write(huge), /INVALID_DEUCALION_FRAME/)
  f.write(frame(3).subarray(0, 5))
  f.clear()
  assert.deepEqual(f.write(frame(0)), [frame(0)])
})
test('DLL hash mismatch is not swallowed', (t) => {
  const options = fixture(t)
  verifyDeucalion(options)
  assert.throws(
    () => verifyDeucalion({ ...options, shasum: '0'.repeat(64) }),
    /mismatch/,
  )
})
test('existing pipe does not inject; repeat start and stop are idempotent', async (t) => {
  let injects = 0,
    starts = 0,
    stops = 0
  const deps: CaptureDependencies = {
    processes: () => [target],
    validate: () => target,
    inject: async () => {
      injects++
    },
    create: () => ({
      start: async () => {
        starts++
      },
      stop: async () => {
        stops++
      },
    }),
  }
  const capture = new CaptureInterface(fixture(t), deps)
  await Promise.all([capture.start(target), capture.start(target)])
  assert.equal(starts, 1)
  assert.equal(injects, 0)
  await assert.rejects(capture.start(target), /ALREADY_CONNECTED/)
  await Promise.all([capture.stop(), capture.stop()])
  assert.equal(stops, 1)
  await capture.start(target)
  await capture.stop()
  assert.equal(starts, 2)
})
test('only a missing pipe permits injection, with a fresh identity check', async (t) => {
  let starts = 0,
    checks = 0,
    injects = 0
  const capture = new CaptureInterface(fixture(t), {
    processes: () => [target],
    validate: () => {
      checks++
      return target
    },
    inject: async () => {
      injects++
    },
    create: () => ({
      start: async () => {
        if (++starts === 1) throw Object.assign(new Error(), { code: 'ENOENT' })
      },
      stop: async () => {},
    }),
  })
  await capture.start(target)
  await capture.stop()
  assert.equal(checks, 2)
  assert.equal(injects, 1)
  assert.equal(starts, 2)
})
test('access errors and changed processes never trigger injection', async (t) => {
  for (const changed of [false, true]) {
    let injects = 0,
      checks = 0
    const capture = new CaptureInterface(fixture(t), {
      processes: () => [target],
      validate: () => {
        if (changed && ++checks === 2)
          throw new Error('PROCESS_CHANGED_OR_EXITED')
        return target
      },
      inject: async () => {
        injects++
      },
      create: () => ({
        start: async () => {
          throw Object.assign(new Error('connection'), {
            code: changed ? 'ENOENT' : 'EACCES',
          })
        },
        stop: async () => {},
      }),
    })
    await assert.rejects(capture.start(target))
    assert.equal(injects, 0)
  }
})
test('stopping during connect cancels it and allows a new session', async (t) => {
  let calls = 0
  const capture = new CaptureInterface(fixture(t), {
    processes: () => [target],
    validate: () => target,
    inject: async () => {
      assert.fail('must not inject')
    },
    create: () => ({
      start: async (signal) => {
        if (++calls > 1) return
        await new Promise<void>((_, reject) =>
          signal?.addEventListener(
            'abort',
            () => reject(new Error('cancelled')),
            { once: true },
          ),
        )
      },
      stop: async () => {},
    }),
  })
  const starting = capture.start(target)
  const rejected = assert.rejects(starting, /cancelled|aborted/)
  await capture.stop()
  await rejected
  await capture.start(target)
  await capture.stop()
})
