import type { Condition } from '@ffxiv/contracts'
export const field = (
  offset: number,
  width: 1 | 2 | 4,
  value: number | string,
): Condition => ({
  op: 'field',
  offset,
  width,
  equals:
    typeof value === 'number'
      ? { kind: 'constant', value }
      : { kind: 'input', key: value },
})
export const all = (...conditions: Condition[]): Condition => ({
  op: 'all',
  conditions,
})
export const any = (...conditions: Condition[]): Condition => ({
  op: 'any',
  conditions,
})

import type { Length } from '@ffxiv/contracts'
import type { Scanner } from '../scanner/interface.mjs'
type StepOptions = Omit<Scanner, 'handler' | 'probe' | 'length'>
const bodyLength = (length: number | Length): Length =>
  typeof length === 'number'
    ? { min: length, max: length, oneOf: [length] }
    : length
/** A body-only Rust probe needs no JavaScript handler. Category comes from the catalog. */
export function defineProbe(
  options: StepOptions & { length: number | Length; match: Condition },
): Scanner {
  const { match, length, ...step } = options
  return { ...step, length: bodyLength(length), probe: match }
}
/** Complex handlers run in the same ordered flow and may commit declared context outputs. */
export function defineWorkerProbe(
  options: StepOptions & {
    length: number | Length
    match: NonNullable<Scanner['handler']>
  },
): Scanner {
  const { match, length, ...step } = options
  return { ...step, length: bodyLength(length), handler: match }
}
