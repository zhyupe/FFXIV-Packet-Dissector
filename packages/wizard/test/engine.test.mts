import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Origin, type DeucalionPacket } from 'pcap'
import { WizardEngine } from '../src/scanner/state.mjs'
import { getScanners } from '../src/scanner/index.mjs'
import type { Scanner } from '../src/scanner/interface.mjs'
const packet = (type = 123, origin = Origin.Server): DeucalionPacket => ({
  origin,
  header: { type } as DeucalionPacket['header'],
  data: Buffer.alloc(16),
})
const scanners: Scanner[] = [
  {
    name: 'First',
    instruction: 'Synthetic step',
    source: Origin.Server,
    fields: [
      { key: '$input', label: 'Synthetic input', type: 'text', required: true },
    ],
    handler: (_, a) => (a.$input ? {} : null),
  },
  {
    name: 'Second',
    instruction: 'Synthetic step',
    source: Origin.Server,
    fields: [],
    handler: () => ({}),
  },
  {
    name: 'Client',
    instruction: 'Synthetic step',
    source: Origin.Client,
    fields: [],
    handler: () => ({}),
  },
]
test('prompts do not queue packets; direct selection and stale input isolation', () => {
  const e = new WizardEngine(scanners)
  e.start()
  const token = e.snapshot().inputToken
  e.write(packet())
  assert.equal(e.snapshot().results.length, 0)
  e.selectStep('Second')
  assert.throws(
    () => e.submitInputs(token, { $input: 'synthetic' }),
    /STALE_INPUT/,
  )
  e.write(packet(124))
  assert.equal(e.snapshot().status, 'stopped')
  assert.equal(e.snapshot().results[0][0], 'Second')
})
test('sequence, per-direction conflicts and re-identification preserve old results', () => {
  const e = new WizardEngine(scanners)
  e.start()
  e.submitInputs(e.snapshot().inputToken, { $input: 'synthetic' })
  e.write(packet())
  assert.equal(e.snapshot().current, 'Second')
  e.write(packet())
  assert.equal(e.snapshot().status, 'conflict')
  assert.equal(e.snapshot().conflict, 'First')
  e.selectStep('Second')
  e.write(packet(124))
  e.selectStep('First')
  e.write(packet(124))
  assert.equal(
    e.snapshot().results.find(([name]) => name === 'First')?.[1].value,
    123,
  )
  e.selectStep('First')
  e.write(packet(125))
  assert.equal(
    e.snapshot().results.find(([name]) => name === 'First')?.[1].value,
    125,
  )
  e.selectStep('Client')
  e.write(packet(125, Origin.Client))
  assert.equal(e.snapshot().results.length, 3)
})
test('state roundtrip retains results, never inputs; stop clears session context', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'wizard-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const path = join(dir, 'state.json')
  const e = new WizardEngine(scanners, path)
  e.start()
  e.submitInputs(e.snapshot().inputToken, { $input: 'Synthetic private input' })
  e.write(packet())
  e.stop(true)
  assert(!readFileSync(path, 'utf8').includes('Synthetic private input'))
  e.selectStep('First')
  assert.equal(e.snapshot().status, 'input')
  const restored = new WizardEngine(scanners, path)
  assert.equal(restored.snapshot().status, 'idle')
  assert.equal(restored.snapshot().results.length, 1)
  restored.selectStep('First')
  assert.equal(restored.snapshot().status, 'input')
  assert.deepEqual(restored.exportResults(), [['First', '0x007b', null]])
  restored.start()
  restored.skip()
  restored.skip()
  const completed = new WizardEngine(scanners, path)
  completed.start()
  assert.equal(completed.snapshot().status, 'completed')
})
test('input validation, short packets, skip, and save failures are explicit', () => {
  const e = new WizardEngine(scanners)
  e.start()
  assert.throws(
    () => e.submitInputs(e.snapshot().inputToken, { $input: '' }),
    /INVALID_INPUT/,
  )
  e.skip()
  assert.equal(e.snapshot().current, 'Second')
  const failing = new WizardEngine([
    {
      ...scanners[1],
      handler: () => {
        throw new Error('synthetic error')
      },
    },
  ])
  failing.start()
  failing.write(packet())
  assert.equal(failing.snapshot().status, 'failed')
  const short = new WizardEngine([
    {
      ...scanners[1],
      handler: (p) => {
        p.data.readUInt32LE(100)
        return {}
      },
    },
  ])
  short.start()
  short.write(packet())
  assert.equal(short.snapshot().status, 'running')
})
test('all shared context dependencies are declared for direct selection', () => {
  const all = getScanners()
  for (const [name, key] of [
    ['PlayerStats', '$maxHP'],
    ['FreeCompanyDialog', '$fcRank'],
    ['AirshipStatusList', '$airshipName'],
    ['AirshipStatus', '$airshipName'],
    ['SubmarineStatusList', '$submarineName'],
  ]) {
    const step = all.find((s) => s.name === name)
    assert(
      step?.fields.some((field) => field.key === key),
      name,
    )
  }
})

test('save failure stops recognition and is recoverable without losing the in-memory result', async (t) => {
  const { mkdirSync, writeFileSync, unlinkSync } = await import('node:fs')
  const dir = mkdtempSync(join(tmpdir(), 'wizard-save-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const parent = join(dir, 'state')
  const e = new WizardEngine([scanners[1]], join(parent, 'state.json'))
  writeFileSync(parent, 'synthetic filesystem obstruction')
  assert.throws(() => e.start(), /SAVE_FAILED/)
  assert.equal(e.snapshot().status, 'failed')
  assert.equal(e.snapshot().error, 'SAVE_FAILED')
  unlinkSync(parent)
  mkdirSync(parent)
  e.start()
  e.write(packet())
  assert.equal(e.snapshot().results.length, 1)
})
