export interface GameProcess {
  pid: number
  startedAt: string
  executable: string
}
export function listGameProcesses(): GameProcess[]
export function injectPID(pid: number, dllFile: string): number
export function getPIDByName(processName: string): number
