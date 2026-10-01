import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import dllInject from 'dll-inject'
import { ErrorCodes } from './interface.mjs'

export interface GameProcess {
  pid: number
  startedAt: string
  executable: string
  version: string
}

export function getGameProcesses(): GameProcess[] {
  return dllInject.listGameProcesses().map((process) => {
    let version = 'unknown'
    try {
      version = readFileSync(
        join(dirname(process.executable), 'ffxivgame.ver'),
        'utf8',
      ).trim()
    } catch {}
    return { ...process, version }
  })
}

export function validateTarget(
  target: Pick<GameProcess, 'pid' | 'startedAt'>,
): GameProcess {
  const process = getGameProcesses().find(
    (p) => p.pid === target.pid && p.startedAt === target.startedAt,
  )
  if (!process) throw new Error('PROCESS_CHANGED_OR_EXITED')
  return process
}

export async function getXIVPID(): Promise<number> {
  const process = getGameProcesses()[0]
  if (!process) throw new Error('GAME_NOT_RUNNING')
  return process.pid
}

export async function injectDll(pid: number, dll: string) {
  const result = dllInject.injectPID(pid, dll)
  if (result !== 0)
    throw new Error(`INJECTION_FAILED:${ErrorCodes[result] ?? result}`)
}
