import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { parseCatalog } from '@ffcafe/elpis-opcode-worker'
import { generateFromDefinitions } from '../src/lua/definitions'
import {
  buildOpcodeEntries,
  defaultOpcodeSource,
  latestVersion,
  readOpcodeSource,
  workerRepository,
} from '../src/opcodes/source'
import { syncOpcodes } from '../src/opcodes/sync'

const repositoryOutput = fileURLToPath(
  new URL('../../../src/', import.meta.url),
)
const revision = 'a'.repeat(40)
const cliEnvironment = { ...process.env }
delete cliEnvironment.NODE_TEST_CONTEXT
const catalogYaml = `ServerZoneIpc:
  direction: server-to-client
  packets:
    ActorCast:
      FFXIVOpcodes: Cast
    ActorControl: {}
    NotImplemented: {}
ClientZoneIpc:
  direction: client-to-server
  packets:
    ActionRequest: {}
    InventoryModifyHandler: {}
    InventoryHandlerOffset: {}
`
const scratch = () => mkdtempSync(join(tmpdir(), 'mjt243 worker '))
function input(root: string, table: Record<string, string>, version = '9.10a') {
  const source = join(root, 'input')
  mkdirSync(join(source, 'json'), { recursive: true })
  writeFileSync(
    join(source, 'source.json'),
    JSON.stringify({ repository: workerRepository, revision }),
  )
  writeFileSync(
    join(source, 'selected-versions.json'),
    JSON.stringify([version]),
  )
  writeFileSync(
    join(source, 'json/version.json'),
    JSON.stringify(['7.57', '9.9', '9.10', '9.10a']),
  )
  writeFileSync(join(source, `json/${version}.json`), JSON.stringify(table))
  writeFileSync(join(source, 'packets.yaml'), catalogYaml)
  return source
}
function output(root: string, name = 'output') {
  const directory = join(root, name)
  mkdirSync(directory, { recursive: true })
  copyFileSync(
    join(repositoryOutput, 'ffxiv.lua'),
    join(directory, 'ffxiv.lua'),
  )
  return directory
}
function files(root: string, prefix = ''): Record<string, string> {
  return Object.fromEntries(
    readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const name = join(prefix, entry.name)
      return entry.isDirectory()
        ? Object.entries(files(join(root, entry.name), name))
        : [[name, readFileSync(join(root, entry.name), 'utf8')]]
    }),
  )
}
function lua(directory: string, source: string) {
  const script = join(directory, '..', 'dispatch-test.lua')
  writeFileSync(script, source)
  const run = spawnSync(process.env.LUA ?? 'lua5.4', [script], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 10_000,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  assert.equal(run.status, 0, `${run.error ?? ''}${run.stderr}`)
}

test('converts aliases, direction collisions and unknowns while excluding field offsets', () => {
  const catalog = parseCatalog(catalogYaml)
  const result = buildOpcodeEntries(
    {
      Cast: '0x0010',
      ActorCast: '0x10',
      ActorControl: '0x10',
      ActionRequest: '0x10',
      Uncatalogued: '0x11',
      InventoryHandlerOffset: '0x12',
      InventoryModifyHandler: '0x13',
    },
    catalog,
  )
  assert.deepEqual(result.opcodes[16], [
    { type: 'ActionRequest', outgoing: true },
    { type: 'ActorCast', outgoing: false },
    { type: 'ActorControl', outgoing: false },
  ])
  assert.deepEqual(result.opcodes[19], [
    { type: 'InventoryModifyHandler', outgoing: true },
  ])
  assert.equal(result.opcodes[18], undefined)
  assert.deepEqual(result.diagnostics, ['Missing direction for Uncatalogued'])
  assert.deepEqual(
    buildOpcodeEntries({ InventoryHandlerOffset: '0x12' }, catalog).opcodes,
    {},
  )
})

test('excludes field offsets with or without a real handler, for equal and different values', () => {
  const catalog = parseCatalog(catalogYaml)
  const cases: Record<string, string>[] = [
    { InventoryHandlerOffset: '0x10' },
    { InventoryHandlerOffset: '0x10', InventoryModifyHandler: '0x10' },
    { InventoryHandlerOffset: '0x11', InventoryModifyHandler: '0x10' },
    { InventoryModifyHandler: '0x10' },
  ]
  for (const table of cases) {
    const result = buildOpcodeEntries(table, catalog)
    assert.deepEqual(
      result.opcodes,
      table.InventoryModifyHandler
        ? { 16: [{ type: 'InventoryModifyHandler', outgoing: true }] }
        : {},
    )
    assert.deepEqual(result.diagnostics, [])
  }
})

test('a selected offset-only version emits no IPC candidates in Lua', () => {
  const root = scratch()
  try {
    const source = input(root, { InventoryHandlerOffset: '0x10' })
    const target = output(root)
    generateFromDefinitions(target, source)
    const module = readFileSync(
      join(target, 'ffxiv_ipc_type_9_10a_cn.lua'),
      'utf8',
    )
    assert(!module.includes('InventoryHandlerOffset'))
    assert(!module.includes('InventoryModifyHandler'))
    lua(
      target,
      `package.path = './?.lua;' .. package.path
Dissector = { get = function(name) return { name = name } end }
local registry = require('ffxiv_ipc_type_latest')
assert(next(registry.types) == nil)
local parser, title = registry.getDissector(16, 32, 'C')
assert(parser == nil and title == nil)
`,
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('reads only the selected files and identifies malformed input by version/path/name', () => {
  const root = scratch()
  try {
    const source = input(root, { ActorCast: '0x10' })
    writeFileSync(join(source, 'json/9.9.json'), 'ignored file')
    assert.equal(readOpcodeSource(source).versions.length, 1)
    writeFileSync(join(source, 'json/9.10a.json'), '{')
    assert.throws(() => readOpcodeSource(source), /9.10a.json/)
    writeFileSync(join(source, 'json/9.10a.json'), '{"ActorCast":"0x10000"}')
    assert.throws(() => readOpcodeSource(source), /9.10a.json.*ActorCast/)
    writeFileSync(join(source, 'selected-versions.json'), '["../escape"]')
    assert.throws(() => readOpcodeSource(source), /selected-versions.json/)
    writeFileSync(join(source, 'selected-versions.json'), '["9.10a","9.10a"]')
    assert.throws(() => readOpcodeSource(source), /selected-versions.json/)
    writeFileSync(join(source, 'selected-versions.json'), '["9.11"]')
    assert.throws(() => readOpcodeSource(source), /Unknown worker version 9.11/)
    writeFileSync(
      join(source, 'source.json'),
      JSON.stringify({ repository: workerRepository, revision: 'master' }),
    )
    assert.throws(
      () => readOpcodeSource(source),
      /source.json.*full commit SHA/,
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('selects latest in source order without rolling back or examining it for an empty selection', () => {
  const root = scratch()
  try {
    const target = output(root)
    const versions = ['7.57', '9.9', '9.10', '9.10a']
    assert.equal(latestVersion(target, versions, ['9.9', '9.10']), '9.10')
    writeFileSync(
      join(target, 'ffxiv_ipc_type_latest.lua'),
      'return require("ffxiv_ipc_type_9_10a_cn")',
    )
    assert.equal(latestVersion(target, versions, ['9.9']), '9.10a')
    assert.throws(
      () => latestVersion(target, ['7.57'], ['7.57']),
      /latest.lua.*absent/,
    )
    writeFileSync(join(target, 'ffxiv_ipc_type_latest.lua'), 'custom text')
    assert.equal(latestVersion(target, versions, []), undefined)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('sync adds explicit versions and refreshes every selection when the revision changes', async () => {
  const root = scratch()
  try {
    const source = input(root, { ActorCast: '0x10' }, '9.9')
    const requests: string[] = []
    const fetcher: typeof fetch = async (url) => {
      const path = String(url)
      requests.push(path)
      return new Response(
        path.endsWith('packets.yaml')
          ? catalogYaml
          : path.endsWith('version.json')
            ? JSON.stringify(['7.57', '9.9', '9.10', '9.10a'])
            : '{"ActorCast":"0x20"}',
      )
    }
    const nextRevision = 'b'.repeat(40)
    await syncOpcodes(source, nextRevision, ['9.10a'], fetcher)
    assert.deepEqual(
      JSON.parse(readFileSync(join(source, 'selected-versions.json'), 'utf8')),
      ['9.9', '9.10a'],
    )
    assert.deepEqual(
      JSON.parse(readFileSync(join(source, 'source.json'), 'utf8')),
      { repository: workerRepository, revision: nextRevision },
    )
    assert(requests.every((url) => url.includes(`/${nextRevision}/`)))
    assert(requests.some((url) => url.endsWith('/9.9.json')))
    assert(requests.some((url) => url.endsWith('/9.10a.json')))
    assert(
      readOpcodeSource(source).versions.every((version) => version.opcodes[32]),
    )
    const badFetch: typeof fetch = async () => new Response('', { status: 503 })
    await assert.rejects(
      syncOpcodes(source, revision, ['9.10a'], badFetch),
      /9.9.*packets.yaml/,
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('ActorCast number changes affect real Lua dispatch, preserve structures and leave other version files untouched', () => {
  const root = scratch()
  try {
    const firstSource = input(join(root, 'first'), {
      ActorCast: '0x10',
      ActorControl: '0x10',
      ActionRequest: '0x10',
      NotImplemented: '0x12',
    })
    const secondSource = input(join(root, 'second'), {
      ActorCast: '0x20',
      ActorControl: '0x10',
      ActionRequest: '0x10',
      NotImplemented: '0x12',
    })
    const first = output(root, 'first-output')
    const second = output(root, 'second-output')
    for (const directory of [first, second])
      writeFileSync(
        join(directory, 'ffxiv_ipc_type_7_57_cn.lua'),
        'historical sentinel',
      )
    generateFromDefinitions(first, firstSource)
    generateFromDefinitions(second, secondSource)
    const a = files(first),
      b = files(second)
    assert.notEqual(
      a['ffxiv_ipc_type_9_10a_cn.lua'],
      b['ffxiv_ipc_type_9_10a_cn.lua'],
    )
    for (const [name, text] of Object.entries(a))
      if (name !== 'ffxiv_ipc_type_9_10a_cn.lua')
        assert.equal(b[name], text, name)
    assert.equal(a['ffxiv_ipc_type_7_57_cn.lua'], 'historical sentinel')
    for (const [directory, opcode, oldOpcode] of [
      [first, 16, 32],
      [second, 32, 16],
    ] as const) {
      lua(
        directory,
        `package.path = './?.lua;' .. package.path
Dissector = { get = function(name) return { name = name } end }
local registry = require('ffxiv_ipc_type_latest')
local payload = string.rep(string.char(0), 32)
local parser, title = registry.getDissector(${opcode}, #payload, 'S')
assert(parser.name == 'ffxiv_ipc_actor_cast' and title == 'ActorCast')
assert(select(2, registry.getDissector(${oldOpcode}, #payload, 'S')) ~= 'ActorCast')
local outgoing, outTitle = registry.getDissector(16, 32, 'C')
assert(outTitle == 'ActionRequest')
local control, controlTitle = registry.getDissector(16, 24, 'S')
assert(control.name == 'ffxiv_ipc_actor_control' and controlTitle == 'ActorControl')
local unknown, unknownTitle = registry.getDissector(18, 32, 'S')
assert(unknown == nil and unknownTitle == 'NotImplemented')
`,
      )
    }
    generateFromDefinitions(first, firstSource)
    assert.deepEqual(files(first), a)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('initial empty selection writes no version modules and preserves the existing latest pointer', () => {
  const root = scratch()
  try {
    const target = output(root)
    for (const file of readdirSync(repositoryOutput).filter((name) =>
      /^ffxiv_ipc_type_.*\.lua$/.test(name),
    )) {
      copyFileSync(join(repositoryOutput, file), join(target, file))
    }
    const before = Object.fromEntries(
      Object.entries(files(target)).filter(([name]) =>
        name.startsWith('ffxiv_ipc_type_'),
      ),
    )
    assert.equal(
      Object.keys(before).filter((name) =>
        /^ffxiv_ipc_type_.*_cn\.lua$/.test(name),
      ).length,
      68,
    )
    generateFromDefinitions(target)
    const after = Object.fromEntries(
      Object.entries(files(target)).filter(([name]) =>
        name.startsWith('ffxiv_ipc_type_'),
      ),
    )
    assert.deepEqual(after, before)
    const blank = output(root, 'blank')
    generateFromDefinitions(blank)
    assert(
      !readdirSync(blank).some((name) => name.startsWith('ffxiv_ipc_type_')),
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('CLI reports bad source with a nonzero exit', () => {
  const root = scratch()
  try {
    const source = input(root, { ActorCast: '0x10000' })
    const target = output(root)
    const run = spawnSync(
      process.execPath,
      [
        '--import',
        import.meta.resolve('tsx'),
        fileURLToPath(new URL('../src/index.ts', import.meta.url)),
        '--output',
        target,
        '--opcode-source',
        source,
      ],
      { cwd: tmpdir(), encoding: 'utf8', env: cliEnvironment },
    )
    assert.notEqual(run.status, 0)
    assert.match(run.stderr, /9.10a.json.*ActorCast/, JSON.stringify(run))
    assert(existsSync(join(target, 'ffxiv.lua')))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
