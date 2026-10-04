import type { Snapshot, WorkerTask, WorkerResult } from '@ffxiv/contracts'
type Identity = Pick<
  WorkerTask,
  'sessionId' | 'runId' | 'inputGeneration' | 'packetSequence'
>
export class WorkerClient {
  private worker?: Worker
  private active?: Identity
  private timeout?: ReturnType<typeof setTimeout>
  constructor(
    private send: (
      action: 'worker.result' | 'worker.failed',
      params: Record<string, unknown>,
      session: number,
    ) => Promise<unknown>,
    private create = () =>
      new Worker(
        new URL('../../wizard/src/worker/entry.mts', import.meta.url),
        { type: 'module' },
      ),
  ) {}
  dispose() {
    clearTimeout(this.timeout)
    this.worker?.terminate()
    this.worker = undefined
    this.active = undefined
  }
  private fail(identity: Identity) {
    if (this.active !== identity) return
    this.dispose()
    void this.send(
      'worker.failed',
      { token: identity.inputGeneration },
      identity.sessionId,
    ).catch(() => {})
  }
  receive(buffer: ArrayBuffer) {
    const length = new DataView(buffer).getUint32(0, true)
    if (length > 512 * 1024 || length + 4 > buffer.byteLength)
      throw new Error('INVALID_WORKER_TASK')
    const task: WorkerTask = JSON.parse(
      new TextDecoder().decode(new Uint8Array(buffer, 4, length)),
    )
    // A new generation must not wait behind an abandoned Worker computation.
    if (
      this.active &&
      (this.active.sessionId !== task.sessionId ||
        this.active.runId !== task.runId ||
        this.active.inputGeneration !== task.inputGeneration)
    )
      this.dispose()
    clearTimeout(this.timeout)
    const identity: Identity = {
      sessionId: task.sessionId,
      runId: task.runId,
      inputGeneration: task.inputGeneration,
      packetSequence: task.packetSequence,
    }
    this.active = identity
    try {
      if (!this.worker) {
        const instance = this.create()
        this.worker = instance
        instance.onmessage = (event: MessageEvent<WorkerResult>) => {
          if (instance !== this.worker || !this.active) return
          const r = event.data
          const current = this.active
          if (
            typeof r.sessionId !== 'number' ||
            typeof r.packetSequence !== 'string'
          ) {
            this.fail(current)
            return
          }
          if (
            r.sessionId !== current.sessionId ||
            r.runId !== current.runId ||
            r.inputGeneration !== current.inputGeneration ||
            r.packetSequence !== current.packetSequence
          )
            return
          clearTimeout(this.timeout)
          void this.send('worker.result', r, current.sessionId).catch(() => {})
        }
        instance.onerror = () => {
          if (instance === this.worker && this.active) this.fail(this.active)
        }
      }
      this.worker.postMessage(buffer, [buffer])
      this.timeout = setTimeout(() => this.fail(identity), 5000)
    } catch {
      this.fail(identity)
    }
  }
  state(snapshot: Snapshot) {
    const active = this.active
    if (!active) return
    const token = snapshot.wizard?.inputToken ?? 0
    // State and Channel deliveries may arrive in either order. An older state
    // snapshot cannot cancel a task belonging to a newer input generation.
    if (
      snapshot.sessionId > active.sessionId ||
      (snapshot.sessionId === active.sessionId &&
        (token > active.inputGeneration ||
          (token === active.inputGeneration &&
            snapshot.wizard?.status !== 'running')))
    )
      this.dispose()
  }
}
