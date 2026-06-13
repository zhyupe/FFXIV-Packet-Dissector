import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DeucalionOptions } from '../interface.mjs'

export const getDefaultDeucalion = () => {
  const dir = fileURLToPath(new URL('../deucalion/1.5.0', import.meta.url))
  return {
    dll: join(dir, 'deucalion.dll'),
    shasum: readFileSync(join(dir, 'deucalion.sha256sum'), 'utf-8').trim(),
  }
}

export function verifyDeucalion({ dll, shasum }: DeucalionOptions) {
  try {
    const buf = readFileSync(dll)
    const computed = createHash('sha256').update(buf).digest('hex')
    if (computed !== shasum) {
      throw new Error('Deucalion shasum mismatch')
    }
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      throw new Error(`deucalion.dll not found in ${dll}`)
    }
  }
}

export function listenAbortEvents(handler: (...args: any[]) => void) {
  ;[
    'beforeExit',
    'SIGHUP',
    'SIGINT',
    'SIGQUIT',
    'SIGILL',
    'SIGTRAP',
    'SIGABRT',
    'SIGBUS',
    'SIGFPE',
    'SIGUSR1',
    'SIGSEGV',
    'SIGUSR2',
    'SIGTERM',
  ].forEach((sig) => {
    process.on(sig, handler)
  })
}
