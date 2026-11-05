import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  normalizeTable,
  type PacketCatalog,
  parseCatalog,
} from '@ffcafe/elpis-opcode-worker'
import type { LuaOpcodeEntry, LuaOpcodeVersion } from '../lua/dissector'

export const workerRepository = 'https://github.com/zhyupe/ffxiv-opcode-worker'
export const defaultOpcodeSource = fileURLToPath(
  new URL('../../resources/opcodes/', import.meta.url),
)

export function atFile<T>(file: string, action: () => T): T {
  try {
    return action()
  } catch (cause) {
    throw new Error(`${file}: ${String(cause)}`, { cause })
  }
}

export const readJson = (file: string): unknown =>
  atFile(file, () => JSON.parse(readFileSync(file, 'utf8')))

export function parseVersions(value: unknown, allowEmpty = false): string[] {
  if (
    !Array.isArray(value) ||
    (!allowEmpty && !value.length) ||
    value.some(
      (v) => typeof v !== 'string' || !/^\d+(?:\.\d+)+[a-z]*$/.test(v),
    ) ||
    new Set(value).size !== value.length
  ) {
    throw new Error(
      `Expected a unique list of safe worker versions: ${JSON.stringify(value)}`,
    )
  }
  return value
}

export function buildOpcodeEntries(
  table: Record<string, string>,
  catalog: PacketCatalog,
) {
  const entries = normalizeTable(table, catalog)
  const opcodes: Record<number, LuaOpcodeEntry[]> = {}
  const diagnostics: string[] = []
  for (const { type, opcode, outgoing } of entries) {
    if (type === 'InventoryHandlerOffset') continue
    if (outgoing === undefined)
      diagnostics.push(`Missing direction for ${type}`)
    const items = opcodes[opcode] ?? []
    items.push({ type, ...(outgoing !== undefined && { outgoing }) })
    opcodes[opcode] = items
  }
  return { opcodes, diagnostics }
}

export function readOpcodeSource(directory = defaultOpcodeSource) {
  const sourceFile = join(directory, 'source.json')
  atFile(sourceFile, () => {
    const source = readJson(sourceFile) as {
      repository?: string
      revision?: string
    }
    if (
      source?.repository !== workerRepository ||
      typeof source.revision !== 'string' ||
      !/^[0-9a-f]{40}$/i.test(source.revision)
    ) {
      throw new Error('Expected worker repository and a full commit SHA')
    }
  })
  const versionsFile = join(directory, 'json/version.json')
  const available = atFile(versionsFile, () =>
    parseVersions(readJson(versionsFile)),
  )
  const selectedFile = join(directory, 'selected-versions.json')
  const selected = atFile(selectedFile, () =>
    parseVersions(readJson(selectedFile), true),
  )
  for (const version of selected) {
    if (!available.includes(version))
      throw new Error(`${selectedFile}: Unknown worker version ${version}`)
  }
  const catalogFile = join(directory, 'packets.yaml')
  const catalog = atFile(catalogFile, () =>
    parseCatalog(readFileSync(catalogFile, 'utf8')),
  )
  const versions: LuaOpcodeVersion[] = []
  const diagnostics: string[] = []
  for (const version of available.filter((v) => selected.includes(v))) {
    const file = join(directory, `json/${version}.json`)
    const result = atFile(file, () =>
      buildOpcodeEntries(readJson(file) as Record<string, string>, catalog),
    )
    versions.push({ version, opcodes: result.opcodes })
    diagnostics.push(
      ...result.diagnostics.map((message) => `${file}: ${message}`),
    )
  }
  return { available, versions, diagnostics }
}

export function latestVersion(
  output: string,
  available: string[],
  selected: string[],
): string | undefined {
  if (!selected.length) return undefined
  const candidates = new Set(selected)
  const file = join(output, 'ffxiv_ipc_type_latest.lua')
  if (existsSync(file)) {
    atFile(file, () => {
      const module = /require\(["']ffxiv_ipc_type_([\w]+)_cn["']\)/.exec(
        readFileSync(file, 'utf8'),
      )?.[1]
      const current = available.find((v) => v.replaceAll('.', '_') === module)
      if (!current)
        throw new Error('Current latest is absent from worker version.json')
      candidates.add(current)
    })
  }
  return available.filter((v) => candidates.has(v)).at(-1)
}
