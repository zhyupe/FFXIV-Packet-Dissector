declare module "@ffxiv-teamcraft/dll-inject" {
  export function injectPID(pid: number, dllFile: string): number;
  export function isProcessRunning(processName: string): boolean;
  export function isProcessRunningPID(pid: number): boolean;
  export function getPIDByName(processName: string): number;
}
