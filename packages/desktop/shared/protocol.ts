export type { GameProcess, Snapshot, WorkerTask, WorkerResult } from '@ffxiv/contracts'
export type Action = 'processes' | 'snapshot' | 'connect' | 'disconnect' | 'forwarder'
  | 'wizard.start' | 'wizard.select' | 'wizard.inputs' | 'wizard.skip' | 'wizard.stop'
  | 'wizard.save' | 'wizard.export' | 'worker.result' | 'worker.failed' | 'shutdown'
