import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { generateFromDefinitions } from './lua/definitions'

const { values } = parseArgs({ options: { output: { type: 'string' } } })
const output = values.output
  ? resolve(values.output)
  : fileURLToPath(new URL('../../../src/', import.meta.url))
generateFromDefinitions(output)
