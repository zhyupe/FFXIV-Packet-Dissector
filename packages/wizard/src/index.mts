import { input, number } from '@inquirer/prompts'
import { createHash } from 'node:crypto'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { emitKeypressEvents } from 'node:readline'
import { CaptureInterface, getGameProcesses } from 'pcap'
import { getScanners } from './scanner/index.mjs'
import { WizardEngine, SCANNER_REVISION, atomicJson } from './scanner/state.mjs'

const target = getGameProcesses()[0]
if (!target) throw new Error('GAME_NOT_RUNNING')
const profile = createHash('sha256')
  .update(
    `${target.executable.toLowerCase()}\0${target.version}\0${SCANNER_REVISION}`,
  )
  .digest('hex')
const outDir = join(
  process.env.LOCALAPPDATA ?? homedir(),
  'FFXIV-Packet-Dissector',
  'wizard',
  profile,
)
const engine = new WizardEngine(getScanners(), join(outDir, 'state.json'))
const capture = new CaptureInterface()
let prompt: AbortController | undefined
let stopping = false
const output = () =>
  atomicJson(join(outDir, 'opcode.json'), engine.exportResults())
const stop = async () => {
  if (stopping) return
  stopping = true
  prompt?.abort()
  try {
    engine.stop(true)
    output()
  } finally {
    await capture.stop()
    if (process.stdin.isTTY) process.stdin.setRawMode(false)
    process.stdin.pause()
  }
}
engine.on('changed', (state: ReturnType<WizardEngine['snapshot']>) => {
  prompt?.abort()
  console.log(state.current ?? 'Finished', state.status)
  const step = state.steps.find((step) => step.name === state.current)
  if (step?.instruction) console.log(step.instruction)
  if (state.status === 'completed') {
    void stop()
    return
  }
  if (state.status !== 'input') return
  const controller = (prompt = new AbortController())
  void (async () => {
    const answers: Record<string, string | number> = Object.create(null)
    for (const field of state.fields) {
      const value =
        field.type === 'number'
          ? await number(
              { message: field.label, required: true },
              { signal: controller.signal },
            )
          : await input(
              { message: field.label, required: true },
              { signal: controller.signal },
            )
      if (value !== undefined) answers[field.key] = value
    }
    engine.submitInputs(state.inputToken, answers)
  })().catch(() => {
    if (!controller.signal.aborted) console.error('INPUT_FAILED')
  })
})
capture.on('packet', (packet) => engine.write(packet))
capture.on('closed', () => void stop())
capture.on('error', () => void stop())
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => void stop())
emitKeypressEvents(process.stdin)
if (process.stdin.isTTY) process.stdin.setRawMode(true)
process.stdin.on('keypress', (_, key) => {
  if (key.name === 'f8' || (key.ctrl && key.name === 'c')) void stop()
  else if (key.name === 'f6') engine.skip()
  else if (key.name === 'f7') output()
})
console.log('F6: skip, F7: export, F8: stop')
try {
  await capture.start(target)
  engine.start()
} catch {
  console.error('WIZARD_START_FAILED')
  await stop()
  process.exitCode = 1
}
