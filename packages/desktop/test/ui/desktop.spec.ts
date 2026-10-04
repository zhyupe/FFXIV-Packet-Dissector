import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { console.error(error.message) })
  page.on('console', message => { if (message.type() === 'error') console.error(message.text()) })
  await page.addInitScript(() => {
    const processes = [
      {
        pid: 123,
        startedAt: '1',
        executable: 'C:\\Synthetic A\\ffxiv_dx11.exe',
        version: 'synthetic-a',
      },
      {
        pid: 456,
        startedAt: '2',
        executable: 'C:\\Synthetic B\\ffxiv_dx11.exe',
        version: 'synthetic-b',
      },
    ]
    const state: any = {
      sessionId: 0,
      connection: 'disconnected',
      target: null,
      forwarder: {
        running: false,
        sent: 0,
        received: 0,
        dropped: 0,
        clientPort: 0,
        serverPort: 0,
        error: '',
      },
      wizard: null,
      error: '',
    }
    let changed = (_: any) => {}
    let failed = (_: string) => {}
    const events: string[] = []
    const copy = () => JSON.parse(JSON.stringify(state))
    const wizard = () => ({
      status: 'idle',
      mode: 'sequence',
      current: 'SyntheticStep',
      inputToken: 0,
      fields: [],
      steps: [
        { name: 'SyntheticStep', instruction: '请执行测试操作。', source: 'S' },
        { name: 'AnotherStep', instruction: '另一个测试步骤。', source: 'S' },
      ],
      results: [],
      error: '',
      conflict: null,
    })
    Object.assign(window, {
      __desktopEvents: events,
      __desktopFail: () => { state.connection='failed';state.forwarder.running=false;if(state.wizard)state.wizard.status='stopped';changed(copy());failed('PIPE_CLOSED') },
      __DESKTOP_TEST_BRIDGE__: {
        subscribe: async (
          handler: (state: any) => void,
          failure: (code: string) => void,
        ) => {
          changed = handler
          failed = failure
          return () => {}
        },
        export: async () => true,
        request: async (action: string, params: any) => {
          events.push(action)
          if (action === 'processes') return processes
          if (action === 'connect') {
            state.sessionId++
            state.connection = 'connected'
            state.target = processes.find((p) => p.pid === params.pid)
            state.forwarder.running = false
            state.wizard = wizard()
          }
          if (action === 'disconnect') {
            state.connection = 'disconnected'
            state.forwarder.running = false
            if (state.wizard) state.wizard.status = 'stopped'
          }
          if (action === 'forwarder') {
            state.forwarder.running = params.enabled
            state.forwarder.mode = params.mode
            state.forwarder.pipe = 'synthetic-pipe'
            state.forwarder.clientPort = 42000
            state.forwarder.serverPort = 42001
          }
          if (action === 'wizard.start' || action === 'wizard.select') {
            state.wizard.status = 'input'
            state.wizard.current = params.name ?? 'SyntheticStep'
            state.wizard.inputToken++
            state.wizard.fields = [
              { key: 'test', type: 'text', required: true, label: '测试输入' },
            ]
          }
          if (action === 'wizard.inputs') {
            state.wizard.status = 'running'
            state.wizard.fields = []
          }
          if (action === 'wizard.stop') state.wizard.status = 'stopped'
          changed(copy())
          return copy()
        },
      },
    })
  })
})

test('no automatic connection; page navigation does not stop independent services', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: '连接并注入' })).toBeEnabled()
  expect(
    await page.evaluate(() => (window as any).__desktopEvents),
  ).not.toContain('connect')
  await page.getByRole('button', { name: '连接并注入' }).click()
  await page.getByRole('button', { name: '启用转发' }).click()
  await page.getByRole('button', { name: 'Wizard', exact: true }).click()
  await page.getByRole('button', { name: '顺序执行／恢复' }).click()
  await page.getByLabel('测试输入').fill('Synthetic UI input')
  await page.getByRole('button', { name: '提交并等待数据' }).click()
  await expect(page.getByRole('status')).toContainText('正在等待')
  await page.getByRole('button', { name: '采集输出', exact: true }).click()
  await expect(page.getByRole('button', { name: '停用转发' })).toBeEnabled()
  await page.getByRole('button', { name: '停用转发' }).click()
  await page.getByRole('button', { name: 'Wizard', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('正在等待')
  await page.screenshot({ path: 'test-results/wizard.png', fullPage: true })
})

test('switching process stops both and direct steps have a fresh form', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: '连接并注入' }).click()
  await page.getByRole('button', { name: '启用转发' }).click()
  await page.getByRole('combobox', { name: '游戏进程' }).selectOption('456:2')
  await page.getByRole('button', { name: '切换并连接' }).click()
  await expect(page.getByRole('button', { name: '启用转发' })).toBeEnabled()
  await page.getByRole('button', { name: 'Wizard', exact: true }).click()
  await page.getByRole('button', { name: /AnotherStep/ }).click()
  await page.getByRole('button', { name: '识别此步骤', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: '填写 AnotherStep 所需信息' }),
  ).toBeVisible()
  await expect(page.getByLabel('测试输入')).toHaveValue('')
})

test('capture failure stops visible work and does not reconnect automatically', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: '连接并注入' }).click()
  await page.getByRole('button', { name: '启用转发' }).click()
  await page.evaluate(() => (window as any).__desktopFail())
  await expect(page.getByRole('alert')).toContainText('游戏采集连接已关闭')
  await expect(page.getByRole('button', { name: '启用转发' })).toBeDisabled()
  const events = await page.evaluate(() => (window as any).__desktopEvents)
  expect(events.filter((s: string) => s === 'connect')).toHaveLength(1)
})
