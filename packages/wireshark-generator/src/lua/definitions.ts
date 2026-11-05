import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PacketMap } from '@ffcafe/elpis-network'
import {
  defaultOpcodeSource,
  latestVersion,
  readOpcodeSource,
} from '../opcodes/source'
import { DissectorRenderer } from './dissector'

export function generateFromDefinitions(
  output: string,
  opcodeSource = defaultOpcodeSource,
) {
  const source = readOpcodeSource(opcodeSource)
  const latest = latestVersion(
    output,
    source.available,
    source.versions.map((v) => v.version),
  )
  for (const diagnostic of source.diagnostics) console.error(diagnostic)
  const renderer = new DissectorRenderer(output)
  for (const [name, struct] of Object.entries(PacketMap)) {
    if (struct) renderer.handleStruct(name, struct)
  }
  renderer.commitEnums()
  renderer.commitOpcodes({ versions: source.versions, latestVersion: latest })
  const licenses = join(output, 'licenses')
  mkdirSync(licenses, { recursive: true })
  for (const [pkg, source, name] of [
    ['@ffcafe/elpis-network', 'LICENSE', 'ELPIS-NETWORK-LICENSE'],
    ['@ffcafe/elpis-struct', 'LICENSE', 'ELPIS-STRUCT-LICENSE'],
    ['@ffcafe/elpis-opcode-worker', 'LICENSE', 'ELPIS-OPCODE-WORKER-LICENSE'],
    [
      '@ffcafe/elpis-network',
      'FFXIVClientStructs.LICENSE',
      'FFXIVClientStructs.LICENSE',
    ],
  ]) {
    const packageDir = dirname(
      fileURLToPath(import.meta.resolve(`${pkg}/package.json`)),
    )
    copyFileSync(join(packageDir, source), join(licenses, name))
  }
  copyFileSync(
    join(defaultOpcodeSource, 'LICENSE'),
    join(licenses, 'OPCODE-WORKER-LICENSE'),
  )
}
