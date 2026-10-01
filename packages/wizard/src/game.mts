import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { getGameProcesses, type GameProcess } from 'pcap'
export function getGameVersion(
  process: GameProcess | undefined = getGameProcesses()[0],
) {
  return process?.version ?? null
}
export function getGameHash(
  process: GameProcess | undefined = getGameProcesses()[0],
) {
  return process
    ? createHash('sha1').update(readFileSync(process.executable)).digest('hex')
    : null
}
