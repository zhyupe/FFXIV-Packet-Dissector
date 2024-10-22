import dllInject from '@ffxiv-teamcraft/dll-inject'
import { exec } from 'child_process'
import { ErrorCodes } from './interface.mjs';

const { getPIDByName, injectPID } = dllInject

async function getXIVPIDFromTasklist(): Promise<{ name: string; pid: number } | null> {
  return new Promise<{ name: string; pid: number } | null>(
    (resolve, reject) => {
      exec('tasklist', (err, stdout) => {
        if (err) {
          reject(err)
        }
        resolve(
          stdout
            .split('\n')
            .map((line) => {
              const match = /(ffxiv_dx11.exe)\s+(\d+)/gm.exec(line)
              if (match) {
                return {
                  name: match[1],
                  pid: +match[2],
                }
              }
            })
            .find(Boolean) || null,
        )
      })
    },
  )
}

export async function getXIVPID(): Promise<number> {
  const fromInjector = getPIDByName('ffxiv_dx11.exe')
  if (fromInjector > 0) {
    return fromInjector
  } else {
    console.log('Process not found, falling back to tasklist')

    const fromTaskList = await getXIVPIDFromTasklist()
    if (fromTaskList) {
      console.log('Found XIV process in tasklist')
      return fromTaskList.pid
    } else {
      throw new Error('GAME_NOT_RUNNING')
    }
  }
}

export async function injectDll(pid: number, dll: string) {
  const res = injectPID(pid, dll)
  if (res !== 0) {
    throw new Error(
      `Dll-inject returned non-zero code: [${res}] ${ErrorCodes[res]}`,
    )
  }
}
