import { createHash } from 'node:crypto'
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve, join } from 'node:path'
import { execFileSync } from 'node:child_process'

export const NODE_VERSION = '22.22.2'
const desktop = fileURLToPath(new URL('..', import.meta.url))
const repo = resolve(desktop, '../..')
const runtime = join(desktop, 'src-tauri/resources')
if (process.platform !== 'win32' || process.arch !== 'x64')
  throw new Error('Runtime packaging requires Windows x64')
if (process.versions.node !== NODE_VERSION)
  throw new Error(`Build native addon with Node ${NODE_VERSION}`)
await mkdir(runtime, { recursive: true })
async function fetchBytes(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) })
  if (!response.ok)
    throw new Error(`Runtime download failed: ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}
const base = `https://nodejs.org/dist/v${NODE_VERSION}`
const [node, sums, license] = await Promise.all([
  fetchBytes(`${base}/win-x64/node.exe`),
  fetchBytes(`${base}/SHASUMS256.txt`),
  fetchBytes(
    `https://raw.githubusercontent.com/nodejs/node/v${NODE_VERSION}/LICENSE`,
  ),
])
const expected = sums
  .toString('utf8')
  .split('\n')
  .find((line) => line.trim().endsWith(' win-x64/node.exe'))
  ?.split(/\s+/)[0]
if (!expected || createHash('sha256').update(node).digest('hex') !== expected)
  throw new Error('Node checksum mismatch')
await writeFile(join(runtime, 'node.exe'), node)
await writeFile(join(runtime, 'NODE-LICENSE'), license)
if (
  execFileSync(join(runtime, 'node.exe'), ['--version'], {
    encoding: 'utf8',
  }).trim() !== `v${NODE_VERSION}`
)
  throw new Error('Runtime version mismatch')
await copyFile(
  join(desktop, 'dist-service/service.mjs'),
  join(runtime, 'service.mjs'),
)
const addon = join(runtime, 'node_modules/dll-inject')
await mkdir(addon, { recursive: true })
await copyFile(
  join(repo, 'packages/dll-inject/build/Release/injector.node'),
  join(addon, 'injector.node'),
)
await writeFile(
  join(addon, 'index.js'),
  "module.exports = require('./injector.node')\n",
)
await writeFile(
  join(addon, 'package.json'),
  JSON.stringify({ name: 'dll-inject', version: '0.0.17', main: 'index.js' }),
)
await copyFile(
  join(repo, 'packages/dll-inject/LICENSE'),
  join(addon, 'LICENSE'),
)
for (const file of ['deucalion.dll', 'deucalion.sha256sum'])
  await copyFile(
    join(repo, 'packages/pcap/deucalion/1.5.0', file),
    join(runtime, file),
  )
await copyFile(
  join(repo, 'packages/pcap/LICENSE'),
  join(runtime, 'PCAP-LICENSE'),
)
await copyFile(join(repo, 'LICENSE'), join(runtime, 'PROJECT-LICENSE'))
await writeFile(
  join(runtime, 'DEUCALION-LICENSE'),
  await fetchBytes(
    'https://raw.githubusercontent.com/ff14wed/deucalion/1.5.0/LICENSE.md',
  ),
)
await writeFile(
  join(runtime, 'build.json'),
  JSON.stringify(
    {
      node: NODE_VERSION,
      abi: process.versions.modules,
      architecture: 'x64',
      deucalion: '1.5.0',
    },
    null,
    2,
  ),
)
// Verify module loading with the exact runtime shipped, not a developer installation.
execFileSync(
  join(runtime, 'node.exe'),
  ['-e', 'require("dll-inject").listGameProcesses()'],
  { cwd: runtime, stdio: 'pipe' },
)
console.log('Prepared and verified the Windows runtime.')
