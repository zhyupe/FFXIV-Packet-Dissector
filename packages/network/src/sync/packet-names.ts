import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'

export const packetsUrl =
  'https://raw.githubusercontent.com/zhyupe/ffxiv-opcode-worker/master/packets.yaml'

export type PacketDirection = 'server-to-client' | 'client-to-server'
export type PacketAliases = ReadonlyMap<string, string>
export interface PacketMetadata {
  category: string
  direction: PacketDirection
  names: Readonly<Record<string, string>>
}
export interface PacketCatalog {
  aliases: PacketAliases
  packets: ReadonlyMap<string, PacketMetadata>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function parsePackets(source: string): PacketCatalog {
  const definitions: unknown = parse(source)
  if (!isRecord(definitions)) {
    throw new Error('Expected IPC categories in packets.yaml')
  }
  const aliases = new Map<string, string>()
  const packets = new Map<string, PacketMetadata>()
  for (const [category, group] of Object.entries(definitions)) {
    if (!category.trim() || !isRecord(group)) {
      throw new Error(`Invalid IPC category: ${category}`)
    }
    const { direction } = group
    if (direction !== 'server-to-client' && direction !== 'client-to-server') {
      throw new Error(
        `Invalid direction for ${category}: expected server-to-client or client-to-server`,
      )
    }
    if (!isRecord(group.packets)) {
      throw new Error(`Expected a packet mapping in ${category}`)
    }
    for (const [name, providers] of Object.entries(group.packets)) {
      if (!name.trim() || !isRecord(providers)) {
        throw new Error(`Invalid packet definition: ${category}.${name}`)
      }
      if (packets.has(name)) {
        throw new Error(
          `Duplicate project packet name across categories: ${name}`,
        )
      }
      for (const [provider, alias] of Object.entries(providers)) {
        if (!provider.trim() || typeof alias !== 'string' || !alias.trim()) {
          throw new Error(`Invalid ${provider} name for ${name}`)
        }
      }
      packets.set(name, {
        category,
        direction,
        names: providers as Record<string, string>,
      })
      const alias = providers.FFXIVOpcodes as string | undefined
      if (alias === undefined) continue
      if (aliases.has(alias)) {
        throw new Error(
          `Ambiguous FFXIVOpcodes name ${alias}: ${aliases.get(alias)} and ${name}`,
        )
      }
      aliases.set(alias, name)
    }
  }
  for (const [alias, name] of aliases) {
    if (alias !== name && packets.has(alias)) {
      throw new Error(
        `FFXIVOpcodes alias ${alias} is also a project packet name`,
      )
    }
  }
  return { aliases, packets }
}

export async function loadPackets({
  file,
  cacheDirectory = join(__dirname, 'cache'),
  fetcher = fetch,
}: {
  file?: string
  cacheDirectory?: string
  fetcher?: typeof fetch
} = {}): Promise<PacketCatalog> {
  if (file) return parsePackets(readFileSync(file, 'utf8'))

  const cacheFile = join(cacheDirectory, 'packets.cache')
  try {
    if (Date.now() - statSync(cacheFile).mtimeMs < 3600e3) {
      return parsePackets(readFileSync(cacheFile, 'utf8'))
    }
  } catch {
    // Missing or invalid cache entries are refreshed from the repository.
  }

  const response = await fetcher(packetsUrl, {
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${packetsUrl}: ${response.status} ${response.statusText}`,
    )
  }
  const source = await response.text()
  const catalog = parsePackets(source)
  mkdirSync(cacheDirectory, { recursive: true })
  writeFileSync(cacheFile, source)
  return catalog
}

export function canonicalPacketName(
  name: string,
  aliases: PacketAliases,
): string {
  if (name === 'InventoryHandlerOffset') return 'InventoryModifyHandler'
  return aliases.get(name) ?? name
}

export function normalizeOpcodeTable(
  table: Record<string, string>,
  aliases: PacketAliases,
) {
  const normalized: Record<string, string> = {}
  for (const [name, opcode] of Object.entries(table)) {
    const canonical = canonicalPacketName(name, aliases)
    const previous = normalized[canonical]
    if (previous && Number(previous) !== Number(opcode)) {
      throw new Error(
        `Conflicting opcodes for ${canonical}: ${previous} and ${opcode}`,
      )
    }
    normalized[canonical] = opcode
  }
  return normalized
}
