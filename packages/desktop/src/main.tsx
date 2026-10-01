import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { GameProcess } from 'pcap'
import type { Action, Snapshot } from '../shared/protocol'
import { bridge } from './bridge'
import './style.css'

const empty: Snapshot = {
  sessionId: 0,
  connection: 'disconnected',
  target: null,
  forwarder: {
    running: false,
    clientPort: 0,
    serverPort: 0,
    sent: 0,
    received: 0,
    dropped: 0,
    error: '',
  },
  wizard: null,
  error: '',
}
const labels: Record<string, string> = {
  disconnected: '未连接',
  connecting: '正在连接',
  connected: '已连接',
  disconnecting: '正在断开',
  failed: '发生错误',
  idle: '未开始',
  input: '等待输入',
  running: '运行中',
  stopped: '已停止',
  completed: '已完成',
  conflict: '结果冲突',
}
const errors: Record<string, string> = {
  CONNECT_FAILED:
    '连接失败。请确认游戏仍在运行，且本工具与游戏的运行权限一致。',
  PROCESS_CHANGED_OR_EXITED: '选中的进程已退出或重新启动，请刷新进程列表。',
  SAVE_FAILED: '进度保存失败。请检查磁盘空间和目录权限，或先导出识别结果。',
  STATE_READ_FAILED: '已有进度无法读取，请检查应用数据目录。',
  INVALID_STATE: '已有进度格式不正确，请检查应用数据目录中的状态文件。',
  BACKEND_EXITED: '后台已退出，采集已停止。请重新启动本程序。',
  BACKEND_START_FAILED: '后台无法启动，请检查安装文件是否完整。',
  COMMAND_TIMEOUT: '操作超时，请断开后重试。',
  STALE_SESSION: '游戏连接已变更，请重新操作。',
  STALE_INPUT: '步骤已切换，请填写当前表单。',
  INVALID_INPUT: '请检查必填项和数字格式。',
  UDP_BIND_FAILED: '无法创建 UDP 转发端口。',
  SCANNER_OR_SAVE_FAILED: '识别步骤或保存失败，请停止后重新选择步骤。',
}
function errorText(code: unknown) {
  return (
    errors[String(code)] ??
    `操作未完成（${/^[A-Z_]+$/.test(String(code)) ? code : '服务不可用'}）。`
  )
}
const processKey = (p: GameProcess) => `${p.pid}:${p.startedAt}`

function App() {
  const [state, setState] = useState(empty)
  const stateRef = useRef(state)
  const [processes, setProcesses] = useState<GameProcess[]>([])
  const [selected, setSelected] = useState('')
  const [page, setPage] = useState<'forwarder' | 'wizard'>('forwarder')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [viewStep, setViewStep] = useState('')
  const dead = useRef(false)
  function update(next: Snapshot) {
    if (next.sessionId < stateRef.current.sessionId || dead.current) return
    stateRef.current = next
    setState(next)
  }
  async function refresh() {
    try {
      const list = (await bridge.request(
        'processes',
        {},
        stateRef.current.sessionId,
      )) as GameProcess[]
      setProcesses(list)
      setSelected((old) =>
        list.some((p) => processKey(p) === old)
          ? old
          : list[0]
            ? processKey(list[0])
            : '',
      )
    } catch (e) {
      setError(errorText(e))
    }
  }
  useEffect(() => {
    let cleanup: (() => void) | undefined
    let cancelled = false
    void bridge
      .subscribe(update, (code) => {
        setError(errorText(code))
        if (code === 'BACKEND_EXITED') {
          dead.current = true
          setState((prev) => ({
            ...prev,
            connection: 'failed',
            forwarder: { ...prev.forwarder, running: false },
            wizard: prev.wizard ? { ...prev.wizard, status: 'stopped' } : null,
          }))
        }
      })
      .then((off) => {
        if (cancelled) {
          off()
          return
        }
        cleanup = off
        void bridge
          .request('snapshot', {}, 0)
          .then((value) => update(value as Snapshot))
          .catch((e) => setError(errorText(e)))
        void refresh()
      })
      .catch((e) => setError(errorText(e)))
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [])
  useEffect(() => {
    setInputs({})
  }, [state.sessionId, state.wizard?.inputToken])
  useEffect(() => {
    setViewStep('')
  }, [state.sessionId])
  async function run(action: Action, params: Record<string, unknown> = {}) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const result = await bridge.request(
        action,
        params,
        stateRef.current.sessionId,
      )
      if (result && typeof result === 'object' && 'connection' in result)
        update(result as Snapshot)
      if (action === 'wizard.save') setNotice('进度已保存')
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  async function exportResults() {
    setBusy(true)
    try {
      if (await bridge.export(stateRef.current.sessionId))
        setNotice('识别结果已导出')
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  const connected = state.connection === 'connected'
  const target = processes.find((p) => processKey(p) === selected)
  const wizard = state.wizard
  const step = wizard?.steps.find(
    (s) => s.name === (viewStep || wizard.current),
  )
  const activeStep = wizard?.steps.find((s) => s.name === wizard.current)
  const results = new Map(wizard?.results ?? [])
  const disabled = busy || dead.current
  return (
    <div className="shell">
      <header className="app-header">
        <div className="app-mark" aria-hidden="true">
          ↔
        </div>
        <div>
          <h1>FFXIV Packet Dissector</h1>
          <p>采集与协议识别工作台</p>
        </div>
        <span className={`pill ${connected ? 'live' : ''}`}>
          <i />
          {labels[state.connection]}
        </span>
      </header>
      <section className="process-bar" aria-label="游戏进程">
        <div className="process-select">
          <label htmlFor="process">游戏进程</label>
          <select
            id="process"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={disabled}
          >
            {!processes.length && (
              <option value="">未发现可访问的游戏进程</option>
            )}
            {processes.map((p) => (
              <option key={processKey(p)} value={processKey(p)}>
                PID {p.pid} · {p.version} · {p.executable}
              </option>
            ))}
          </select>
        </div>
        <button onClick={() => void refresh()} disabled={disabled}>
          刷新
        </button>
        <button
          className="primary"
          disabled={
            disabled ||
            !target ||
            state.connection === 'connecting' ||
            (connected &&
              state.target &&
              selected === processKey(state.target)) ||
            false
          }
          onClick={() =>
            target &&
            void run('connect', {
              pid: target.pid,
              startedAt: target.startedAt,
            })
          }
        >
          {connected ? '切换并连接' : '连接并注入'}
        </button>
        <button
          disabled={
            dead.current ||
            !['connected', 'connecting'].includes(state.connection)
          }
          onClick={() => void run('disconnect')}
        >
          {state.connection === 'connecting' ? '取消连接' : '断开'}
        </button>
      </section>
      <div className="connection-detail">
        {state.target ? (
          <>
            当前：PID {state.target.pid}
            <span>{state.target.version}</span>
            <span className="path" title={state.target.executable}>
              {state.target.executable}
            </span>
          </>
        ) : (
          '启动游戏后刷新列表，选择要连接的进程。'
        )}
        <span className="hint">切换进程会停止转发与识别</span>
      </div>
      <nav aria-label="工作区">
        <button
          aria-current={page === 'forwarder' ? 'page' : undefined}
          onClick={() => setPage('forwarder')}
        >
          Forwarder{' '}
          <span className={state.forwarder.running ? 'dot on' : 'dot'} />
        </button>
        <button
          aria-current={page === 'wizard' ? 'page' : undefined}
          onClick={() => setPage('wizard')}
        >
          Wizard{' '}
          <span className={wizard?.status === 'running' ? 'dot on' : 'dot'} />
        </button>
      </nav>
      {error && (
        <div className="alert" role="alert">
          {error}
          <button aria-label="关闭提示" onClick={() => setError('')}>
            ×
          </button>
        </div>
      )}
      {(state.error || state.forwarder.error || wizard?.error) && !error && (
        <div className="alert" role="alert">
          {errorText(state.error || state.forwarder.error || wizard?.error)}
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <main>
        {page === 'forwarder' ? (
          <section className="forwarder-page">
            <div className="section-heading">
              <div>
                <span className="eyebrow">WIRESHARK FORWARDER</span>
                <h2>将游戏通信转发到本机</h2>
                <p>在 Wireshark 中选择回环接口，使用下方过滤器捕获数据。</p>
              </div>
              <button
                className={state.forwarder.running ? 'danger' : 'primary'}
                disabled={disabled || !connected}
                onClick={() =>
                  void run('forwarder', { enabled: !state.forwarder.running })
                }
              >
                {state.forwarder.running ? '停用转发' : '启用转发'}
              </button>
            </div>
            <div className="metrics">
              <div>
                <span>客户端 → 服务端</span>
                <strong>{state.forwarder.sent.toLocaleString()}</strong>
                <small>已转发的数据包</small>
              </div>
              <div>
                <span>服务端 → 客户端</span>
                <strong>{state.forwarder.received.toLocaleString()}</strong>
                <small>已转发的数据包</small>
              </div>
              <div>
                <span>未能转发</span>
                <strong>{state.forwarder.dropped.toLocaleString()}</strong>
                <small>超出大小或队列限制、发送失败</small>
              </div>
            </div>
            <div className="filter">
              <label>捕获过滤器</label>
              <code>udp and host 127.0.0.11</code>
              <button
                onClick={() =>
                  void navigator.clipboard
                    .writeText('udp and host 127.0.0.11')
                    .then(() => setNotice('过滤器已复制'))
                    .catch(() => setError('复制失败，请手动选择过滤器文本。'))
                }
              >
                复制
              </button>
            </div>
            <dl className="endpoints">
              <div>
                <dt>客户端地址</dt>
                <dd>
                  127.0.0.11
                  {state.forwarder.running &&
                    ` : ${state.forwarder.clientPort}`}
                </dd>
              </div>
              <div>
                <dt>服务端地址</dt>
                <dd>
                  127.0.0.12
                  {state.forwarder.running &&
                    ` : ${state.forwarder.serverPort}`}
                </dd>
              </div>
              <div>
                <dt>转发状态</dt>
                <dd>{state.forwarder.running ? '运行中' : '已停用'}</dd>
              </div>
            </dl>
            <p className="footnote">
              停用转发不会停止 Wizard。切换工作区也不会中断正在运行的任务。
            </p>
          </section>
        ) : (
          <section className="wizard-page">
            <aside className="steps">
              <div className="steps-top">
                <h2>识别步骤</h2>
                <span>
                  {results.size} / {wizard?.steps.length ?? 0}
                </span>
              </div>
              <input
                aria-label="筛选步骤"
                placeholder="筛选包名…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="step-list">
                {wizard?.steps
                  .filter((s) =>
                    s.name.toLowerCase().includes(query.toLowerCase()),
                  )
                  .map((s, i) => (
                    <button
                      key={s.name}
                      aria-pressed={step?.name === s.name}
                      onClick={() => setViewStep(s.name)}
                    >
                      <span
                        className={
                          results.has(s.name)
                            ? 'step-number done'
                            : 'step-number'
                        }
                      >
                        {results.has(s.name)
                          ? '✓'
                          : String(i + 1).padStart(2, '0')}
                      </span>
                      <span>
                        {s.name}
                        <small>
                          {s.source === 'S'
                            ? '服务端 → 客户端'
                            : '客户端 → 服务端'}
                        </small>
                      </span>
                      {wizard.current === s.name && <span className="dot on" />}
                    </button>
                  ))}
              </div>
            </aside>
            <div className="wizard-detail">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">OPCODE WIZARD</span>
                  <h2>{step?.name ?? '开始协议识别'}</h2>
                </div>
                <span className="pill">{labels[wizard?.status ?? 'idle']}</span>
              </div>
              <p className="instruction">
                {step?.instruction ||
                  '连接游戏进程后，按照步骤提示在游戏内操作。'}
              </p>
              <div className="toolbar">
                <button
                  className="primary"
                  disabled={disabled || !connected}
                  onClick={() => {
                    setViewStep('')
                    void run('wizard.start')
                  }}
                >
                  顺序执行／恢复
                </button>
                <button
                  disabled={disabled || !connected || !step}
                  onClick={() => {
                    if (step) {
                      setViewStep('')
                      void run('wizard.select', { name: step.name })
                    }
                  }}
                >
                  {step && results.has(step.name)
                    ? '重新识别此步骤'
                    : '识别此步骤'}
                </button>
                <button
                  disabled={
                    disabled ||
                    !connected ||
                    !wizard ||
                    ['idle', 'stopped', 'completed'].includes(wizard.status)
                  }
                  onClick={() => {
                    setViewStep('')
                    void run('wizard.skip')
                  }}
                >
                  跳过
                </button>
                <button
                  disabled={
                    disabled ||
                    !connected ||
                    !wizard ||
                    ['idle', 'stopped', 'completed'].includes(wizard.status)
                  }
                  onClick={() => void run('wizard.stop')}
                >
                  停止
                </button>
              </div>
              {wizard?.status === 'input' && (
                <form
                  className="input-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    const answers = Object.fromEntries(
                      wizard.fields.map((f) => [
                        f.key,
                        f.type === 'number'
                          ? Number(inputs[f.key])
                          : (inputs[f.key] ?? ''),
                      ]),
                    )
                    void run('wizard.inputs', {
                      token: wizard.inputToken,
                      answers,
                    })
                  }}
                >
                  <h3>填写 {activeStep?.name} 所需信息</h3>
                  <p>输入仅用于当前连接，不会保存到磁盘。</p>
                  {wizard.fields.map((field) => (
                    <label key={field.key}>
                      {field.label}
                      <input
                        required={field.required}
                        type={field.type}
                        min={field.type === 'number' ? 0 : undefined}
                        maxLength={4096}
                        value={inputs[field.key] ?? ''}
                        onChange={(e) =>
                          setInputs({ ...inputs, [field.key]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                  <button className="primary" disabled={disabled}>
                    提交并等待数据
                  </button>
                </form>
              )}
              {wizard?.status === 'running' && (
                <div className="waiting" role="status">
                  <span className="dot on" />
                  正在等待 {activeStep?.name} 对应的游戏操作
                </div>
              )}
              {wizard?.status === 'conflict' && (
                <div className="alert" role="alert">
                  候选 opcode 与 {wizard.conflict}{' '}
                  冲突，未覆盖原结果。请选择相关步骤重新识别。
                </div>
              )}
              <div className="results-heading">
                <h3>
                  识别结果 <span>{results.size}</span>
                </h3>
                <div>
                  <button
                    disabled={disabled || !wizard}
                    onClick={() => void run('wizard.save')}
                  >
                    保存进度
                  </button>
                  <button
                    disabled={disabled || !results.size}
                    onClick={() => void exportResults()}
                  >
                    导出 JSON
                  </button>
                </div>
              </div>
              <div className="result-table">
                <table>
                  <thead>
                    <tr>
                      <th>包名</th>
                      <th>方向</th>
                      <th>Opcode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...results].map(([name, r]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td>{r.source === 'S' ? '服务端' : '客户端'}</td>
                        <td>
                          <code>0x{r.value.toString(16).padStart(4, '0')}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!results.size && <p className="empty">尚无识别结果</p>}
              </div>
              <p className="footnote">
                识别结果来自现有扫描规则，仍需结合客户端结构人工核验。
              </p>
            </div>
          </section>
        )}
      </main>
      <footer>
        <span>
          <i className={state.forwarder.running ? 'dot on' : 'dot'} />
          Forwarder：{state.forwarder.running ? '运行中' : '已停用'}
        </span>
        <span>
          <i className={wizard?.status === 'running' ? 'dot on' : 'dot'} />
          Wizard：{labels[wizard?.status ?? 'idle']}
        </span>
        <span className="footer-right">本地会话 · 不记录原始包</span>
      </footer>
    </div>
  )
}
createRoot(document.getElementById('root')!).render(<App />)
