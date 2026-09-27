import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test, type TestContext } from 'node:test'
import { canonicalPacketName, loadPackets, normalizeOpcodeTable, packetsUrl, parsePackets } from '../src/sync/packet-names'

function serverPackets(source: string) {
  return 'ServerZoneIpc:\n  direction: server-to-client\n  packets:\n' + source.replace(/^/gm, '    ')
}
const source = serverPackets('CompanyAirshipStatus:\n  FFXIVOpcodes: AirshipTimers\n  ACT: ACTAirship\n  OverlayPlugin: OverlayPluginAirship\n')

function directory(t: TestContext) {
  const path = mkdtempSync(join(tmpdir(), 'packet-catalog-'))
  t.after(() => rmSync(path, { recursive: true, force: true }))
  return path
}

test('worker catalog maps FFXIVOpcodes aliases without mixing ACT or OverlayPlugin names', () => {
  const { aliases, packets } = parsePackets(source)
  assert.deepEqual(packets.get('CompanyAirshipStatus'), {
    category: 'ServerZoneIpc', direction: 'server-to-client',
    names: { FFXIVOpcodes: 'AirshipTimers', ACT: 'ACTAirship', OverlayPlugin: 'OverlayPluginAirship' },
  })
  assert.equal(canonicalPacketName('AirshipTimers', aliases), 'CompanyAirshipStatus')
  assert.equal(canonicalPacketName('CompanyAirshipStatus', aliases), 'CompanyAirshipStatus')
  assert.equal(canonicalPacketName('ACTAirship', aliases), 'ACTAirship')
  assert.equal(canonicalPacketName('OverlayPluginAirship', aliases), 'OverlayPluginAirship')
  assert.equal(canonicalPacketName('Unmapped', aliases), 'Unmapped')
  assert.equal(canonicalPacketName('InventoryHandlerOffset', aliases), 'InventoryModifyHandler')
  assert.deepEqual(normalizeOpcodeTable({ CompanyAirshipStatus: '0x0010', AirshipTimers: '0x10' }, aliases), { CompanyAirshipStatus: '0x10' })
  assert.throws(() => normalizeOpcodeTable({ CompanyAirshipStatus: '0x0010', AirshipTimers: '0x11' }, aliases), /Conflicting/)
})

test('invalid YAML and ambiguous aliases are rejected', () => {
  for (const input of [
    '', '[]', 'Packet: []',
    ...[
      'Packet: []', 'Packet:\n  FFXIVOpcodes: 123\n',
      'Packet:\n  FFXIVOpcodes: One\n  FFXIVOpcodes: Two\n',
      'First:\n  FFXIVOpcodes: Alias\nSecond:\n  FFXIVOpcodes: Alias\n',
      'First:\n  FFXIVOpcodes: Second\nSecond:\n  FFXIVOpcodes: Third\n',
    ].map(serverPackets),
  ]) assert.throws(() => parsePackets(input))
})

test('remote catalog is fetched from the worker repository and reused from a fresh cache', async (t) => {
  const cacheDirectory = directory(t)
  let calls = 0
  const fetcher: typeof fetch = async (url) => {
    calls++
    assert.equal(url, packetsUrl)
    assert.match(String(url), /\/packets\.yaml$/)
    return new Response(source)
  }
  const first = await loadPackets({ cacheDirectory, fetcher })
  assert.equal(first.aliases.get('AirshipTimers'), 'CompanyAirshipStatus')
  assert.equal(readFileSync(join(cacheDirectory, 'packets.cache'), 'utf8'), source)
  const cached = await loadPackets({ cacheDirectory, fetcher })
  assert.deepEqual(cached, first)
  assert.equal(calls, 1)
})

test('expired and invalid caches refresh both metadata and mappings', async (t) => {
  const cacheDirectory = directory(t)
  const cacheFile = join(cacheDirectory, 'packets.cache')
  const updated = 'ClientLobbyIpc:\n  direction: client-to-server\n  packets:\n    NewProjectName:\n      FFXIVOpcodes: NewSourceName\n'
  for (const previous of [source, 'Packet: [']) {
    writeFileSync(cacheFile, previous)
    if (previous === source) utimesSync(cacheFile, 0, 0)
    let calls = 0
    const { aliases, packets } = await loadPackets({ cacheDirectory, fetcher: async () => {
      calls++
      return new Response(updated)
    } })
    assert.equal(calls, 1)
    assert.equal(aliases.get('NewSourceName'), 'NewProjectName')
    assert.equal(aliases.has('AirshipTimers'), false)
    assert.equal(packets.get('NewProjectName')?.category, 'ClientLobbyIpc')
    assert.equal(packets.get('NewProjectName')?.direction, 'client-to-server')
  }
})

test('failed requests or invalid remote catalogs do not populate the cache', async (t) => {
  const cacheDirectory = directory(t)
  for (const fetcher of [
    async () => new Response('missing', { status: 404 }),
    async () => new Response('Packet: []'),
    async () => { throw new Error('offline') },
  ]) {
    await assert.rejects(loadPackets({ cacheDirectory, fetcher }))
    assert.equal(existsSync(join(cacheDirectory, 'packets.cache')), false)
  }
})

test('a local packets file is reloaded without fetching or consulting the remote cache', async (t) => {
  const cacheDirectory = directory(t)
  const file = join(cacheDirectory, 'packets.yaml')
  writeFileSync(join(cacheDirectory, 'packets.cache'), source)
  const fetcher: typeof fetch = async () => { throw new Error('Must not fetch') }
  for (const alias of ['FirstSource', 'SecondSource']) {
    writeFileSync(file, serverPackets(`ProjectName:\n  FFXIVOpcodes: ${alias}\n`))
    const { aliases } = await loadPackets({ file, cacheDirectory, fetcher })
    assert.deepEqual([...aliases], [[alias, 'ProjectName']])
  }
  rmSync(file)
  await assert.rejects(loadPackets({ file, cacheDirectory, fetcher }), /ENOENT/)
})

test('packet direction comes from YAML independently of the IPC category', () => {
  for (const category of ['ServerZoneIpc', 'ClientZoneIpc', 'ServerLobbyIpc', 'ClientLobbyIpc', 'ServerChatIpc', 'ClientChatIpc', 'CustomIpc']) {
    for (const direction of ['server-to-client', 'client-to-server']) {
      const { aliases, packets } = parsePackets(JSON.stringify({ [category]: { direction, packets: { KnownPacket: {} } } }))
      assert.deepEqual(packets.get('KnownPacket'), { category, direction, names: {} })
      assert.equal(aliases.size, 0)
    }
  }
})

test('invalid category metadata and cross-category name collisions are rejected', () => {
  const server = { direction: 'server-to-client', packets: { First: { FFXIVOpcodes: 'Alias' } } }
  const client = { direction: 'client-to-server', packets: { Second: {} } }
  for (const input of [
    { '': server },
    { '   ': server },
    { CustomIpc: null },
    { CustomIpc: [] },
    ...[undefined, null, '', 'outgoing', true, 0, [], {}].map(direction => ({ ServerZoneIpc: { ...server, direction } })),
    { ServerZoneIpc: { packets: {} } },
    { ServerZoneIpc: { direction: 'server-to-client', packets: [] } },
    { ServerZoneIpc: server, ClientZoneIpc: { ...client, packets: { First: {} } } },
    { ServerZoneIpc: server, ClientZoneIpc: { ...client, packets: { Alias: {} } } },
    { ServerZoneIpc: server, ClientZoneIpc: { ...client, packets: { Second: { FFXIVOpcodes: 'Alias' } } } },
  ]) assert.throws(() => parsePackets(JSON.stringify(input)))
})
