import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { codePath, formatCode, writeCode } from './utils'

const ipcRoot = join(codePath, 'definitions/ipc')

const commentRegex = /\/\*\s*ipc:([\w, ])+\s*\*\//g
const exportRegex = /export (?:class|const) (\w+)/g
const fileFilter = (file: string) =>
  !file.startsWith('.') && file.endsWith('.ts')

function readIPCs() {
  const files = readdirSync(ipcRoot).filter(
    (file) => fileFilter(file) && file !== 'index.ts',
  )
  files.sort()

  const map: Array<{ file: string; exports: string[] }> = []
  for (const file of files) {
    const content = readFileSync(join(ipcRoot, file), 'utf-8')
    const exports = []

    let match: RegExpExecArray | null = commentRegex.exec(content)
    while (match) {
      exports.push(...match[1].split(',').map((item) => item.trim()))
      match = commentRegex.exec(content)
    }

    if (!exports.length) {
      match = exportRegex.exec(content)
      while (match) {
        exports.push(match[1])
        match = exportRegex.exec(content)
      }
    }

    map.push({ file: file.substr(0, file.length - 3), exports })
  }

  console.log(map)
  return map
}

function generateIPCIndexFile(
  ipcs: ReturnType<typeof readIPCs>,
  exports: string[],
  packetMapExports: string[],
  commonFiles: string[],
) {
  return `
import { NormalizedOpcode } from '@/opcode'
import type { StructConstructor } from '@/struct/struct'
${ipcs
  .map((item) => `import { ${item.exports.join(', ')} } from './${item.file}'`)
  .join('\n')}

function packetMapTypeConstraint<T extends Partial<Record<NormalizedOpcode, StructConstructor>>>(map: T) {
  return map as { [K in NormalizedOpcode]: T extends { [k in K]: infer R } ? R : undefined }
}

export const PacketMap = packetMapTypeConstraint({
${packetMapExports.map((item) => `  [NormalizedOpcode.${item}]: ${item},`).join('\n')}
})

export {
${exports.map((item) => `  ${item},`).join('\n')}
}

${commonFiles.map((item) => `export * from './common/${item}'`).join('\n')}
`
}

export async function syncIPCs(opcodeTypes: string[]) {
  const ipcs = readIPCs()
  const exports = ([] as string[]).concat(...ipcs.map((item) => item.exports))
  exports.sort()
  const opcodeTypeSet = new Set(opcodeTypes)
  const packetMapExports = exports.filter((item) => opcodeTypeSet.has(item))

  const commonFiles = readdirSync(join(ipcRoot, 'common'))
    .filter(fileFilter)
    .map((item) => item.substr(0, item.length - 3))
  await writeCode(
    `definitions/ipc/index.ts`,
    generateIPCIndexFile(ipcs, exports, packetMapExports, commonFiles),
  )

  formatCode(`definitions/ipc/index.ts`)
  return exports
}
