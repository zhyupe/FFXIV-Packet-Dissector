import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const DEFAULT_RECV_SIGNATURE = "E8 $ { ' } 4C 8B 4E 10 8B 46 1C 45"
const defaults = {
  recvSignature: DEFAULT_RECV_SIGNATURE,
  sendSignature: '40 53 56 48 83 EC 38 48 8B D9 48 8B F2 8B',
  sendLobbySignature: '40 53 48 83 EC 20 44 8B 41 28',
}
type HookSignatures = typeof defaults
const fields = [
  ['recvSignature', '接收钩子修复特征'],
  ['sendSignature', '发送钩子修复特征'],
  ['sendLobbySignature', '登录服发送钩子修复特征'],
] as const
const storageKey = 'capture.hookSignatures'

export function loadHookSignatures(): HookSignatures {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored === null) return {
      ...defaults, recvSignature: localStorage.getItem('capture.recvSignature') ?? DEFAULT_RECV_SIGNATURE,
    }
    const value = JSON.parse(stored)
    return Object.fromEntries(fields.map(([key]) =>
      [key, typeof value?.[key] === 'string' ? value[key] : defaults[key]])) as HookSignatures
  } catch {
    return { ...defaults }
  }
}

export function CaptureSettings({ signatures, onSave }: {
  signatures: HookSignatures
  onSave: (value: HookSignatures) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [draft, setDraft] = useState(signatures)
  const [error, setError] = useState('')
  return <>
    <Button variant="outline" onClick={() => {
      setDraft(signatures)
      setError('')
      dialog.current?.showModal()
    }}>设置</Button>
    <dialog ref={dialog} className="capture-settings" aria-labelledby="capture-settings-title">
      <form onSubmit={(event) => {
        event.preventDefault()
        const value = { ...draft }
        for (const [key, label] of fields) {
          value[key] = draft[key].trim().replace(/\s+/g, ' ')
          if (!value[key]) continue
          const recv = key === 'recvSignature'
          const prefix = "E8 $ { ' } "
          const suffix = (recv ? value[key].slice(prefix.length) : value[key]).split(' ')
          if (value[key].length > 512 || (recv && !value[key].startsWith(prefix)) ||
            suffix.length < 8 || suffix.length > 64 ||
            suffix.some(token => !/^(?:[\da-fA-F]{2}|\?\?)$/.test(token)) ||
            suffix.filter(token => token !== '??').length < 6) {
            setError(label + '格式无效：' + (recv ? "以 E8 $ { ' } 开头，" : '') +
              '包含 8–64 个字节或 ??，至少 6 个固定字节。')
            return
          }
        }
        try {
          localStorage.setItem(storageKey, JSON.stringify(value))
        } catch {
          setError('无法保存设置，请检查应用存储是否可用。')
          return
        }
        onSave(value)
        dialog.current?.close()
      }}>
        <h2 id="capture-settings-title">采集设置</h2>
        {fields.map(([key, label]) => <div key={key} className="hook-setting">
          <Label htmlFor={key}>{label}</Label>
          <Input id={key} value={draft[key]} maxLength={512}
            onChange={event => setDraft({ ...draft, [key]: event.target.value })} spellCheck={false}
            placeholder="留空以停用自动修复" />
        </div>)}
        <p>仅修复未启用的钩子。修改后重新连接生效，各项留空可单独停用。</p>
        <p>解混淆钩子（CREATE_TARGET）不支持运行时修复，失效时需更新采集组件。</p>
        <p>请使用已验证的特征；错误的特征可能导致游戏退出。</p>
        {error && <p role="alert">{error}</p>}
        <div className="capture-settings-actions">
          <Button type="button" variant="ghost" onClick={() => setDraft({ ...defaults })}>恢复默认</Button>
          <Button type="button" variant="outline" onClick={() => dialog.current?.close()}>取消</Button>
          <Button type="submit">保存</Button>
        </div>
      </form>
    </dialog>
  </>
}
