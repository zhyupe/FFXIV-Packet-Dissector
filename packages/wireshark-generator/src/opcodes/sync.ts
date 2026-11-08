import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { fetchVersion, parseCatalog } from '@ffcafe/elpis-opcode-worker'
import {
  atFile,
  buildOpcodeEntries,
  defaultOpcodeSource,
  parseVersions,
  readJson,
  workerRepository,
} from './source'

export async function syncOpcodes(
  directory: string,
  revision: string,
  additions: string[],
  fetcher?: typeof fetch,
) {
  const selection = join(directory, 'selected-versions.json')
  const selected = existsSync(selection)
    ? atFile(selection, () => parseVersions(readJson(selection), true))
    : []
  const targets = [...new Set([...selected, ...parseVersions(additions)])]
  let available: string[] = []
  for (const version of targets) {
    const files = await fetchVersion({ revision, version, fetcher })
    const index = join(directory, 'json/version.json')
    available = atFile(index, () =>
      parseVersions(JSON.parse(files.versionsJson)),
    )
    if (!available.includes(version))
      throw new Error(`${index}: Unknown worker version ${version}`)
    const catalog = atFile(join(directory, 'packets.yaml'), () =>
      parseCatalog(files.catalogYaml),
    )
    const file = join(directory, `json/${version}.json`)
    const { diagnostics } = atFile(file, () =>
      buildOpcodeEntries(JSON.parse(files.opcodesJson), catalog),
    )
    for (const diagnostic of diagnostics)
      console.error(`${file}: ${diagnostic}`)
    mkdirSync(join(directory, 'json'), { recursive: true })
    writeFileSync(file, files.opcodesJson)
    writeFileSync(index, files.versionsJson)
    writeFileSync(join(directory, 'packets.yaml'), files.catalogYaml)
  }
  writeFileSync(
    selection,
    `${JSON.stringify(
      available.filter((v) => targets.includes(v)),
      null,
      2,
    )}\n`,
  )
  writeFileSync(
    join(directory, 'source.json'),
    `${JSON.stringify({ repository: workerRepository, revision }, null, 2)}\n`,
  )
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const { values } = parseArgs({
      options: {
        revision: { type: 'string' },
        version: { type: 'string', multiple: true },
        'opcode-source': { type: 'string' },
      },
    })
    if (!values.revision || !values.version?.length)
      throw new Error('Expected --revision <full SHA> and --version <version>')
    await syncOpcodes(
      values['opcode-source']
        ? resolve(values['opcode-source'])
        : defaultOpcodeSource,
      values.revision,
      values.version,
    )
  } catch (error) {
    console.error(String(error))
    process.exitCode = 1
  }
}
