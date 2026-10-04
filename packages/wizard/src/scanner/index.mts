import { getImportedScanners } from './imported.mjs'
import { probes } from '../probes.mjs'
import { defineProbe } from '../sdk/index.mjs'

export const getScanners = () =>
  getImportedScanners().map((scanner) => {
    const probe = probes[scanner.name]
    if (!probe) return scanner
    const { handler: _handler, ...step } = scanner
    return defineProbe({
      ...step,
      length: {
        min: Math.min(...probe.lengths),
        max: Math.max(...probe.lengths),
        oneOf: probe.lengths,
      },
      match: probe.match,
    })
  })
