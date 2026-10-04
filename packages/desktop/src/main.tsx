import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { GameProcess } from '@ffxiv/contracts'
import type { Action, Snapshot } from '../shared/protocol'
import { bridge } from './bridge'
import './style.css'

const empty: Snapshot = {
  sessionId: 0,
  connection: 'disconnected',
  target: null,
  forwarder: {
    running: false,
    mode: 'pipe',
    pipe: '',
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
  WORKER_FAILED: '复杂规则执行失败，请重新选择步骤。',
  WORKER_TIMEOUT: '复杂规则执行超时，已停止本次识别。',
  WIZARD_OVERFLOW: '候选包积压超过限制，请重新执行本次操作。',
  PREREQUISITE_REQUIRED: '请先完成该步骤的前置操作。',
  STATE_UNAVAILABLE:
    '识别进度不可用，请解决存储问题后重新连接。采集输出仍可使用。',
  BUILD_VERSION_UNKNOWN:
    '无法读取游戏版本，已停用识别以避免混用进度；采集输出仍可使用。',
  PROFILE_IN_USE: '另一个窗口正在使用这份识别进度。',
  PIPE_CLOSED: '游戏采集连接已关闭。',
  DLL_HASH_MISMATCH: '采集组件校验失败，请检查发行文件是否完整。',
  CONNECT_FAILED:
    '连接失败。请确认游戏仍在运行，且本工具与游戏的运行权限一致。',
  PROCESS_CHANGED_OR_EXITED: '选中的进程已退出或重新启动，请刷新进程列表。',
  SAVE_FAILED: '进度保存失败。请检查磁盘空间和目录权限，或先导出识别结果。',
  STATE_READ_FAILED: '已有进度无法读取，请检查应用数据目录。',
  INVALID_STATE: '已有进度格式不正确，请检查应用数据目录中的状态文件。',
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
  const [outputMode, setOutputMode] = useState<'pipe' | 'udp'>('pipe')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [query, setQuery] = useState('')
  const [viewStep, setViewStep] = useState('')
  function update(next: Snapshot) {
    if (next.sessionId < stateRef.current.sessionId) return
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
      if (['wizard.start', 'wizard.select', 'wizard.skip'].includes(action))
        setViewStep('')
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
  const disabled = busy
  const connecting = state.connection === 'connecting'
  const sameTarget =
    connected && state.target && selected === processKey(state.target)
  const disconnectAction = connecting || sameTarget
  const visibleSteps =
    wizard?.steps
      .map((item, index) => ({ ...item, number: index + 1 }))
      .filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase()),
      ) ?? []
  return (
    <div className="shell">
      <section className="process-bar" aria-label="游戏进程">
        <label htmlFor="process">游戏进程</label>
        <select
          id="process"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={disabled || connecting}
        >
          {!processes.length && <option value="">未发现游戏进程</option>}
          {processes.map((p) => (
            <option key={processKey(p)} value={processKey(p)}>
              PID {p.pid} · {p.version} · {p.executable}
            </option>
          ))}
        </select>
        <button
          onClick={() => void refresh()}
          disabled={disabled || connecting}
        >
          刷新
        </button>
        <button
          className={disconnectAction ? undefined : 'primary'}
          disabled={
            connecting ? false : disabled || (!disconnectAction && !target)
          }
          title={
            connected && !sameTarget
              ? '切换进程将停止采集输出与识别'
              : undefined
          }
          onClick={() => {
            if (disconnectAction) void run('disconnect')
            else if (target)
              void run('connect', {
                pid: target.pid,
                startedAt: target.startedAt,
              })
          }}
        >
          {connecting
            ? '取消连接'
            : sameTarget
              ? '断开'
              : connected
                ? '切换连接'
                : '连接'}
        </button>
      </section>
      {connected && state.target && !sameTarget && (
        <div className="connection-detail">
          当前连接：PID {state.target.pid} · {state.target.version}
        </div>
      )}
      <nav aria-label="工作区">
        <button
          aria-current={page === 'forwarder' ? 'page' : undefined}
          onClick={() => setPage('forwarder')}
        >
          采集输出{' '}
          <span className={state.forwarder.running ? 'dot on' : 'dot'} />
        </button>
        <button
          aria-current={page === 'wizard' ? 'page' : undefined}
          onClick={() => setPage('wizard')}
        >
          Wizard{' '}
          <span className={wizard?.status === 'running' ? 'dot on' : 'dot'} />
        </button>
        <span className={`pill connection-status ${connected ? 'live' : ''}`}>
          {labels[state.connection]}
        </span>
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
            <div className="output-controls">
              <label htmlFor="output-mode">输出方式</label>
              <select
                id="output-mode"
                value={outputMode}
                disabled={state.forwarder.running || disabled}
                onChange={(e) =>
                  setOutputMode(e.target.value as 'pipe' | 'udp')
                }
              >
                <option value="pipe">Wireshark 命名管道</option>
                <option value="udp">UDP 兼容输出</option>
              </select>
              <button
                className={state.forwarder.running ? 'danger' : 'primary'}
                disabled={disabled || !connected}
                onClick={() =>
                  void run('forwarder', {
                    enabled: !state.forwarder.running,
                    mode: outputMode,
                  })
                }
              >
                {state.forwarder.running ? '停用转发' : '启用转发'}
              </button>
              <button
                disabled={
                  disabled ||
                  !state.forwarder.running ||
                  state.forwarder.mode !== 'pipe'
                }
                onClick={() =>
                  void bridge
                    .openWireshark?.()
                    .catch((e) => setError(errorText(e)))
                }
              >
                打开 Wireshark
              </button>
            </div>
            <div className="metrics">
              <div>
                <span>客户端 → 服务端</span>
                <strong>{state.forwarder.sent.toLocaleString()}</strong>
              </div>
              <div>
                <span>服务端 → 客户端</span>
                <strong>{state.forwarder.received.toLocaleString()}</strong>
              </div>
              <div>
                <span>未能转发</span>
                <strong>{state.forwarder.dropped.toLocaleString()}</strong>
              </div>
            </div>
            <div className="filter">
              <span>{outputMode === 'pipe' ? '管道地址' : '捕获过滤器'}</span>
              {outputMode === 'pipe' && !state.forwarder.pipe ? (
                <span className="filter-value placeholder">启用后显示</span>
              ) : (
                <code className="filter-value">
                  {outputMode === 'pipe'
                    ? state.forwarder.pipe
                    : 'udp and host 127.0.0.11'}
                </code>
              )}
              <button
                disabled={outputMode === 'pipe' && !state.forwarder.pipe}
                onClick={() =>
                  void navigator.clipboard
                    .writeText(
                      outputMode === 'pipe'
                        ? state.forwarder.pipe
                        : 'udp and host 127.0.0.11',
                    )
                    .then(() =>
                      setNotice(
                        outputMode === 'pipe'
                          ? '管道地址已复制'
                          : '过滤器已复制',
                      ),
                    )
                    .catch(() => setError('复制失败，请手动选择文本。'))
                }
              >
                复制
              </button>
            </div>
            {outputMode === 'udp' && (
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
            )}
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
                {!wizard && (
                  <p className="empty">
                    {error ? '步骤加载失败' : '正在加载步骤…'}
                  </p>
                )}
                {wizard && !visibleSteps.length && (
                  <p className="empty">未找到匹配步骤</p>
                )}
                {visibleSteps.map((s) => (
                  <button
                    key={s.name}
                    aria-pressed={step?.name === s.name}
                    onClick={() => setViewStep(s.name)}
                  >
                    <span
                      className={
                        results.has(s.name) ? 'step-number done' : 'step-number'
                      }
                    >
                      {results.has(s.name)
                        ? '✓'
                        : String(s.number).padStart(2, '0')}
                    </span>
                    <span>
                      {s.name}
                      <small>
                        {s.source === 'S'
                          ? '服务端 → 客户端'
                          : '客户端 → 服务端'}
                      </small>
                    </span>
                    {wizard?.current === s.name &&
                      ['input', 'running'].includes(wizard.status) && (
                        <span className="dot on" />
                      )}
                  </button>
                ))}
              </div>
            </aside>
            <div className="wizard-detail">
              <div className="section-heading">
                <h2>{step?.name ?? '选择步骤'}</h2>
                <span className="pill">{labels[wizard?.status ?? 'idle']}</span>
              </div>
              <p className="instruction">
                {step?.instruction || '从左侧选择要识别的包。'}
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
                  顺序识别
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
              {wizard?.unsaved && (
                <p role="status">识别结果尚未保存，请重试保存或导出。</p>
              )}
              <div className="results-heading">
                <h3>
                  识别结果 <span>{results.size}</span>
                </h3>
                <div>
                  <button
                    disabled={disabled || !wizard || !state.target}
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
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
createRoot(document.getElementById('root')!).render(<App />)
