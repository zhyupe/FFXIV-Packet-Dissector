import { expect, test } from '@playwright/test'
import manifest from 'wizard/manifest' with { type: 'json' }

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { console.error(error.message) })
  page.on('console', message => { if (message.type() === 'error') console.error(message.text()) })
  await page.addInitScript((catalog) => {
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
    state.wizard = { ...wizard(), current: catalog[0].name, steps: catalog }
    Object.assign(window, {
      __desktopNoProcesses: () => { processes.length = 0 },
      __desktopShowBundledInput: () => {
        const step = catalog.find((item) => item.name === 'UpdateHpMpTp')!
        state.wizard = { ...wizard(), steps: catalog, current: step.name, status: 'input', fields: step.fields, inputToken: 1 }
        changed(copy())
      },
      __desktopConnecting: () => { state.connection = 'connecting'; changed(copy()) },
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
  }, manifest.steps)
})

test('no automatic connection; page navigation does not stop independent services', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: '连接' })).toBeEnabled()
  expect(
    await page.evaluate(() => (window as any).__desktopEvents),
  ).not.toContain('connect')
  await page.getByRole('button', { name: '连接' }).click()
  await page.getByRole('button', { name: '启用转发' }).click()
  await page.screenshot({ path: 'test-results/shadcn-capture.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('tab', { name: 'Wizard', exact: true }).click()
  await page.getByRole('button', { name: '顺序识别' }).click()
  await page.getByLabel('测试输入').fill('Synthetic UI input')
  await page.getByRole('button', { name: '提交并等待数据' }).click()
  await expect(page.getByRole('status')).toContainText('正在等待')
  await page.getByRole('tab', { name: '采集输出', exact: true }).click()
  await expect(page.getByRole('button', { name: '停用转发' })).toBeEnabled()
  await page.getByRole('button', { name: '停用转发' }).click()
  await page.getByRole('tab', { name: 'Wizard', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('正在等待')
  await page.screenshot({ path: 'test-results/wizard.png', fullPage: true, animations: 'disabled' })
})

test('switching process stops both and direct steps have a fresh form', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: '连接' }).click()
  await page.getByRole('button', { name: '启用转发' }).click()
  await page.getByRole('combobox', { name: '游戏进程' }).click()
  await page.getByRole('option', { name: /PID 456/ }).click()
  await page.getByRole('button', { name: '切换连接' }).click()
  await expect(page.getByRole('button', { name: '启用转发' })).toBeEnabled()
  await page.getByRole('tab', { name: 'Wizard', exact: true }).click()
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
  await page.getByRole('button', { name: '连接' }).click()
  await page.getByRole('button', { name: '启用转发' }).click()
  await page.evaluate(() => (window as any).__desktopFail())
  await expect(page.getByRole('alert')).toContainText('游戏采集连接已关闭')
  await expect(page.getByRole('button', { name: '启用转发' })).toBeDisabled()
  const events = await page.evaluate(() => (window as any).__desktopEvents)
  expect(events.filter((s: string) => s === 'connect')).toHaveLength(1)
})


test('bundled wizard steps are browsable before connecting, with recognition disabled', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Wizard', exact: true }).click()
  await expect(page.locator('.step-list button')).toHaveCount(manifest.steps.length)
  await expect(page.getByRole('button', { name: '顺序识别' })).toBeDisabled()
  await expect(page.getByRole('button', { name: '保存进度' })).toBeDisabled()
  const selected = manifest.steps[3]
  await page.getByLabel('筛选步骤').fill(selected.name)
  await page.locator('.step-list button').filter({ hasText: selected.name }).first().click()
  await expect(page.locator('.wizard-detail h2')).toHaveText(selected.name)
  await expect(page.getByRole('button', { name: '识别此步骤', exact: true })).toBeDisabled()
  await page.getByLabel('筛选步骤').fill('no-such-synthetic-step')
  await expect(page.getByText('未找到匹配步骤')).toBeVisible()
  await page.getByLabel('筛选步骤').clear()
  await page.screenshot({ path: 'test-results/shadcn-wizard-catalog.png', fullPage: true, animations: 'disabled' })
})

test('one connection action follows connect, switch, disconnect and cancel states', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: '断开', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '连接', exact: true }).click()
  await expect(page.getByRole('button', { name: '连接', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '断开', exact: true })).toBeEnabled()
  await page.getByRole('combobox', { name: '游戏进程' }).click()
  await page.getByRole('option', { name: /PID 456/ }).click()
  await expect(page.getByRole('button', { name: '断开', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '切换连接', exact: true })).toBeEnabled()
  await page.getByRole('combobox', { name: '游戏进程' }).click()
  await page.getByRole('option', { name: /PID 123/ }).click()
  await page.getByRole('button', { name: '断开', exact: true }).click()
  await expect(page.getByRole('button', { name: '连接', exact: true })).toBeEnabled()
  await page.evaluate(() => (window as any).__desktopConnecting())
  await page.getByRole('button', { name: '取消连接', exact: true }).click()
  await expect(page.getByRole('button', { name: '连接', exact: true })).toBeEnabled()
})

test('compact layout fits the minimum window and tabs have no hover background', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 610 })
  await page.goto('/')
  await page.evaluate(() => (window as any).__desktopNoProcesses())
  await page.getByRole('button', { name: '刷新', exact: true }).click()
  await expect(page.getByRole('button', { name: '连接', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: '复制', exact: true })).toBeDisabled()
  const tab = page.getByRole('tab', { name: 'Wizard', exact: true })
  await tab.hover()
  await expect(tab).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const status = page.locator('.connection-status')
  expect(await status.evaluate(el => getComputedStyle(el).paddingLeft === getComputedStyle(el).paddingRight)).toBe(true)
  await page.screenshot({ path: 'test-results/capture-compact.png', fullPage: true, animations: 'disabled' })
  await tab.click()
  await expect(page.locator('.step-list button')).toHaveCount(manifest.steps.length)
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/wizard-compact.png', fullPage: true, animations: 'disabled' })
})


test('shadcn selectors and tabs support keyboard navigation without stopping capture', async ({ page }) => {
  await page.goto('/')
  const process = page.getByRole('combobox', { name: '游戏进程' })
  await process.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('listbox')).toBeVisible()
  await expect(page.getByRole('option', { name: /PID 123/ })).toBeFocused()
  await page.keyboard.press('End')
  await expect(page.getByRole('option', { name: /PID 456/ })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(process).toContainText('PID 456')
  await page.getByRole('button', { name: '连接', exact: true }).click()
  await page.getByRole('combobox', { name: '输出方式' }).click()
  await page.getByRole('option', { name: 'UDP 兼容输出' }).click()
  await page.getByRole('button', { name: '启用转发' }).click()
  await expect(page.getByRole('combobox', { name: '输出方式' })).toBeDisabled()
  await page.getByRole('tab', { name: '采集输出', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tabpanel', { name: 'Wizard' })).toBeVisible()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('tabpanel', { name: '采集输出' })).toBeVisible()
  await expect(page.getByRole('button', { name: '停用转发' })).toBeEnabled()
})


test('shadcn scroll area hides its scrollbar and preserves wheel and keyboard scrolling', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '连接', exact: true }).click()
  await page.evaluate(() => (window as any).__desktopShowBundledInput())
  await page.getByRole('tab', { name: 'Wizard', exact: true }).click()
  await expect(page.locator('.input-form input')).toHaveCount(1)
  const edges = await page.locator('.steps').evaluate(el => {
    const right = (selector: string) => el.querySelector(selector)!.getBoundingClientRect().right
    return [right('[data-slot="input"]'), right('.steps-top > span'), right('.step-list button')]
  })
  expect(Math.max(...edges) - Math.min(...edges)).toBeLessThanOrEqual(1)
  await page.locator('.section-heading h2').click()
  await page.screenshot({ path: 'test-results/shadcn-wizard.png', fullPage: true, animations: 'disabled' })
  const list = page.locator('.step-list')
  const scrollbar = list.locator('[data-slot="scroll-area-scrollbar"]')
  const viewport = list.locator('[data-slot="scroll-area-viewport"]')
  await expect(scrollbar).toBeHidden()
  await list.hover()
  await expect(scrollbar).toBeVisible()
  await page.mouse.wheel(0, 500)
  await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(0)
  await page.getByRole('tab', { name: 'Wizard', exact: true }).hover()
  await expect(scrollbar).toBeHidden()
  await list.getByRole('button').first().focus()
  const previous = await viewport.evaluate(el => el.scrollTop)
  await page.keyboard.press('PageDown')
  await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(previous)
})
