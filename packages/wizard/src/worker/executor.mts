import type { WorkerTask, WorkerResult } from '@ffxiv/contracts'
import { getScanners } from '../scanner/index.mjs'
import names from '../../generated/names.json' with { type: 'json' }
import manifest from '../../generated/manifest.json' with { type: 'json' }
const scanners = new Map(
  getScanners().map((s) => [(names as Record<string, string>)[s.name], s]),
)
export function execute(task: WorkerTask, body: Uint8Array): WorkerResult {
  const result: WorkerResult = {
    version: task.version,
    sessionId: task.sessionId,
    runId: task.runId,
    inputGeneration: task.inputGeneration,
    rulePackHash: task.rulePackHash,
    ruleId: task.ruleId,
    packetSequence: task.packetSequence,
    matched: false,
    updates: {},
    error: false,
  }
  try {
    if (task.version !== 1 || task.rulePackHash !== manifest.hash)
      throw new Error('RULE_PACK_MISMATCH')
    const scanner = scanners.get(task.ruleId)
    const step = manifest.steps.find((s) => s.name === task.ruleId)
    if (!scanner?.handler || !step) throw new Error('UNKNOWN_STEP')
    const context = { ...task.context } as Record<string, string | number>
    const found = scanner.handler(
      {
        data: body,
        origin: scanner.source,
        header: {
          sourceActor: task.sourceActor,
          targetActor: task.targetActor,
          type: 0,
        },
      },
      task.inputs as Record<string, string | number>,
      context,
    )
    if (found) {
      result.matched = true
      for (const key of step.produces || [])
        if (context[key] !== undefined) result.updates![key] = context[key]
      if (/^Base offset: 0x[0-9a-f]{1,4}$/i.test(found.comment || ''))
        result.baseOffset = parseInt(found.comment!.split('0x')[1], 16)
    }
  } catch (e) {
    if (!(e instanceof RangeError)) result.error = true
  }
  return result
}
