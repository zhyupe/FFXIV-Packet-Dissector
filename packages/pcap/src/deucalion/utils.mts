import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { DeucalionOptions } from '../interface.mjs'

export const getDefaultDeucalion = () => {
  return {
    dll: fileURLToPath(new URL('../deucalion/deucalion.dll', import.meta.url)),
    shasum: readFileSync(
      fileURLToPath(
        new URL('../deucalion/deucalion.sha256sum', import.meta.url),
      ),
      'utf-8',
    ).trim(),
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
  [
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