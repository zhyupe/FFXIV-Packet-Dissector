import { syncIPCs } from './ipc'
import { syncOpcodes } from './opcode'

async function main() {
  const opcodeTypes = await syncOpcodes()
  await syncIPCs(opcodeTypes)
}

void main()
