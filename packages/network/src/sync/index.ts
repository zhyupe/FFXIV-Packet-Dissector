import { parseArgs } from 'node:util'
import { syncIPCs } from './ipc'
import { syncOpcodes } from './opcode'

async function main() {
  const { values } = parseArgs({ options: { packets: { type: 'string' } } })
  const opcodeTypes = await syncOpcodes(values.packets)
  await syncIPCs(opcodeTypes)
}

void main()
