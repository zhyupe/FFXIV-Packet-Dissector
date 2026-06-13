import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { codePath, formatCode, writeCode } from './utils'

const urls = {
  opcodeVersions:
    'https://raw.githubusercontent.com/zhyupe/ffxiv-opcode-worker/master/json/version.json',
  opcodeJson: (version: string) =>
    `https://raw.githubusercontent.com/zhyupe/ffxiv-opcode-worker/master/json/${version}.json`,
}

const cacheDir = join(__dirname, 'cache')

async function request(url: string, cacheFile: string, cacheTime = 3600e3) {
  try {
    const stat = statSync(cacheFile)
    if (Date.now() - stat.mtimeMs < cacheTime) {
      return readFileSync(cacheFile, 'utf-8')
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
  return body
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

export async function syncOpcodes(opcodeTypes: string[]) {
  mkdirSync(cacheDir, { recursive: true })

  const cnVersions = JSON.parse(
    await request(urls.opcodeVersions, join(cacheDir, 'opcode-versions.cache')),
  )
  for (const version of cnVersions) {
    const table = JSON.parse(
      await request(
        urls.opcodeJson(version),
        join(cacheDir, `opcode-${version}.cache`),
      ),
    )
    await writeCode(
      `opcode/cn-${version}.ts`,
      generateOpcodeFile('CN', version, table, opcodeTypes),
    )
  }

  await writeCode(`opcode/index.ts`, generateIndexFile())
  await formatCode('opcode')
}
