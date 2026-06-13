import { syncIPCs } from './ipc'
import { syncOpcodes } from './opcode'

async function main() {
  const exports = await syncIPCs()
  await syncOpcodes(exports)
}

void main()
