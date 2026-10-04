import { copyFile, mkdir, readFile, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
const desktop = fileURLToPath(new URL('..',import.meta.url))
const root = resolve(desktop,'../..')
const resources = join(desktop,'src-tauri/resources')
await rm(resources,{recursive:true,force:true})
await mkdir(join(resources,'extcap/ffxiv-resources'),{recursive:true})
const source = join(root,'resources/deucalion')
const lock = JSON.parse(await readFile(join(root,'resources/dependencies.lock.json'),'utf8'))
const dll = await readFile(join(source,'deucalion.dll'))
if (createHash('sha256').update(dll).digest('hex') !== lock.deucalion.sha256) throw new Error('Deucalion checksum mismatch')
for (const file of ['deucalion.dll','deucalion.sha256sum','LICENSE.md']) await copyFile(join(source,file),join(resources,'extcap/ffxiv-resources',file))
console.log('Prepared verified native resources; no JavaScript runtime is shipped.')
