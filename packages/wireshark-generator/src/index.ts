import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { generateFromDefinitions } from './lua/definitions'

try {
  const { values } = parseArgs({
    options: {
      output: { type: 'string' },
      'opcode-source': { type: 'string' },
    },
  })
  const output = values.output
    ? resolve(values.output)
    : fileURLToPath(new URL('../../../src/', import.meta.url))
  generateFromDefinitions(
    output,
    values['opcode-source'] ? resolve(values['opcode-source']) : undefined,
  )
} catch (error) {
  console.error(String(error))
  process.exitCode = 1
}
