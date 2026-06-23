import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { codePath, formatCode, readCode, writeCode } from './utils'

const urls = {
  opcodeVersions:
    'https://raw.githubusercontent.com/zhyupe/ffxiv-opcode-worker/master/json/version.json',
  opcodeJson: (version: string) =>
    `https://raw.githubusercontent.com/zhyupe/ffxiv-opcode-worker/master/json/${version}.json`,
}

const cacheDir = join(__dirname, 'cache')

async function request(url: string, cacheName: string, cacheTime = 3600e3) {
  const cacheFile = join(cacheDir, `${cacheName}.cache`)
  try {
    const stat = statSync(cacheFile)
    if (Date.now() - stat.mtimeMs < cacheTime) {
      const text = readFileSync(cacheFile, 'utf-8')
      return JSON.parse(text)
    }
  } catch {
    //
  }

  console.log('[request]', url)
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  }

  const body = await res.text()

  writeFileSync(cacheFile, body)
  return JSON.parse(body)
}

function generateOpcodeFile(
  region: string,
  version: string,
  table: Record<string, string>,
  opcodeTypes: string[],
) {
  const opcodes: Record<
    string,
    Array<{ type: string; size?: number; outgoing?: boolean }>
  > = {}
  for (const [name, _opcode] of Object.entries(table)) {
    if (!name || !_opcode) {
      console.log(`Invalid row: ${version}, ${name}, ${_opcode}`)
      continue
    }

    if (!opcodeTypes.includes(name)) {
      continue
    }

    const opcode = _opcode.toLowerCase()
    if (!opcodes[opcode]) {
      opcodes[opcode] = []
    }

    opcodes[opcode].push({
      type: name,
    })
  }

  return `
// biome-ignore-all lint/complexity/useSimpleNumberKeys: opcode maps are easier to audit in hexadecimal
import { NormalizedOpcode } from './normalized-opcode.enum'
import type { OpcodeMap } from './opcode-map.type'

export const ${region}_${version.replace(/\./g, '_')}: OpcodeMap = {
${Object.entries(opcodes)
  .sort(([a], [b]) => parseInt(a, 16) - parseInt(b, 16))
  .map(
    ([opcode, items]) => `  ${opcode}: [
${items
  .map(
    (item) =>
      `    { type: NormalizedOpcode.${item.type}${
        typeof item.outgoing === 'boolean'
          ? `, outgoing: ${item.outgoing ? 'true' : 'false'}`
          : ''
      }${typeof item.size === 'number' ? `, size: ${item.size}` : ''} },`,
  )
  .join('\n')}
  ],`,
  )
  .join('\n')}
}
`
}

function generateIndexFile() {
  const outputs = readdirSync(join(codePath, 'opcode'))
  const importCollator = new Intl.Collator('en', { numeric: true })
  const versions: Record<string, string[]> = {
    CN: outputs
      .map((item) => /cn-(.+)\.ts/.exec(item)?.[1])
      .filter((item) => item) as string[],
    Global: outputs
      .map((item) => /global-(.+)\.ts/.exec(item)?.[1])
      .filter((item) => item) as string[],
  }
  return `
// biome-ignore-all assist/source/organizeImports: generated version imports keep upstream order
export * from './normalized-opcode.enum'
export * from './opcode-map.type'

${Object.entries(versions)
  .map(([k, vs]) =>
    [...vs]
      .sort((a, b) =>
        importCollator.compare(
          `${k.toLowerCase()}-${a}`,
          `${k.toLowerCase()}-${b}`,
        ),
      )
      .map(
        (v) =>
          `import { ${k}_${v.replace(
            /\./g,
            '_',
          )} } from './${k.toLowerCase()}-${v}'`,
      )
      .join('\n'),
  )
  .join('\n')}
${Object.entries(versions)
  .map(
    ([k, vs]) => `
export const ${k}Opcode = {
${vs.map((v) => `  '${v}': ${k}_${v.replace(/\./g, '_')},`).join('\n')}
}`,
  )
  .join('\n')}
`
}

function generateNormalizedOpcodeFile(opcodes: string[]) {
  return `
export enum NormalizedOpcode {
${opcodes.map((item) => `  ${item} = '${item}',`).join('\n')}
}
`
}

export async function syncOpcodes() {
  mkdirSync(cacheDir, { recursive: true })

  const cnVersions: string[] = await request(
    urls.opcodeVersions,
    'opcode-versions',
  )
  const latestVersion = cnVersions.at(-1)
  if (!latestVersion) {
    throw new Error('No opcode versions found')
  }

  const latestTable: Record<string, string> = await request(
    urls.opcodeJson(latestVersion),
    `opcode-${latestVersion}`,
  )

  const opcodeTypeSet = new Set(Object.keys(latestTable))
  try {
    const existed = readCode('opcode/normalized-opcode.enum.ts')
    const matches = existed.matchAll(/(\w+) = ['"](\w+)['"]/g)

    for (const match of matches) {
      if (match[1] !== match[2]) continue
      opcodeTypeSet.add(match[1])
    }
  } catch {
    //
  }

  const opcodeTypes = Array.from(opcodeTypeSet).sort()
  writeCode(
    'opcode/normalized-opcode.enum.ts',
    generateNormalizedOpcodeFile(opcodeTypes),
  )

  for (const version of cnVersions) {
    const codeFile = `opcode/cn-${version}.ts`
    if (existsSync(join(codePath, codeFile))) {
      continue
    }

    const table = await request(urls.opcodeJson(version), `opcode-${version}`)
    writeCode(codeFile, generateOpcodeFile('CN', version, table, opcodeTypes))
  }

  writeCode(`opcode/index.ts`, generateIndexFile())
  await formatCode('opcode')
  return opcodeTypes
}
