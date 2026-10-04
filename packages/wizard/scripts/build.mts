import { readFileSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { parse } from 'yaml'
import { getImportedScanners } from '../src/scanner/imported.mjs'
import { getScanners } from '../src/scanner/index.mjs'
import { prerequisites, continuation, produces } from '../src/flows.mjs'
import { probes } from '../src/probes.mjs'
import type { Manifest, Step } from '@ffxiv/contracts'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const catalogSource = readFileSync(resolve(root, 'resources/metadata/packets.yaml'), 'utf8')
const catalogLock = JSON.parse(readFileSync(resolve(root,'resources/metadata/source.json'),'utf8'))
if(createHash('sha256').update(catalogSource).digest('hex') !== catalogLock.sha256) throw new Error('Catalog snapshot checksum mismatch')
const catalog = parse(catalogSource)
const lookup = new Map<string, {name:string; category:string; source:string}>()
for (const [category, group] of Object.entries(catalog) as [string, any][]) {
  const source = group.direction === 'server-to-client' ? 'S' : group.direction === 'client-to-server' ? 'C' : null
  if (!source) throw new Error('Invalid catalog direction')
  for (const [name, aliases] of Object.entries(group.packets) as [string, Record<string,string>][]) {
    lookup.set(`${source}:${name}`, {name, category, source})
    for (const alias of Object.values(aliases)) if (!lookup.has(`${source}:${alias}`)) lookup.set(`${source}:${alias}`, {name, category, source})
  }
}
const scanners = getScanners()
const renames = new Map<string,string>()
const steps: Step[] = scanners.map(s => {
  // Match the actual 288-byte body, rather than perpetuating the historical scanner label.
  const lookupName = s.name === 'EventPlay32' ? 'EventPlay64' : s.name
  const metadata = lookup.get(`${s.source}:${lookupName}`)
  if (!metadata) throw new Error(`Missing canonical catalog entry: ${s.name}`)
  renames.set(s.name, metadata.name)
  const channel = metadata.category.includes('Zone') ? 1 : metadata.category.includes('Lobby') ? 0 : metadata.category.includes('Chat') ? 2 : undefined
  if (channel === undefined) throw new Error(`Channel binding required: ${metadata.category}`)
  return { ...metadata, channel, instruction: s.instruction || '继续观察上一项操作产生的数据。', fields: s.fields.map(f => ({...f, shared: f.shared ?? f.key.startsWith('$')})),
    requires: s.requires ?? prerequisites[s.name] ?? [], continuation: s.continuation ?? continuation.has(s.name), produces: s.produces ?? produces[s.name] ?? [],
    length: s.length ?? {min:0,max:1024*1024,oneOf:[]}, probe: s.probe ?? null }
})
for (const step of steps) step.requires = step.requires!.map(name => renames.get(name)!)
if (new Set(steps.map(s => s.name)).size !== steps.length) throw new Error('Duplicate canonical scanner')
function sources(dir:string):string { return readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name < b.name ? -1 : a.name > b.name ? 1 : 0).map(e=>e.isDirectory()?sources(resolve(dir,e.name)):e.name + '\0' + readFileSync(resolve(dir,e.name),'utf8').replace(/\r\n/g,'\n')).join('\0') }
const hash = createHash('sha256').update(JSON.stringify(steps)).update(sources(resolve(root,'packages/wizard/src'))).digest('hex')
const manifest: Manifest = {version:1,hash,steps}
const generated = resolve(root,'packages/wizard/generated'); mkdirSync(generated,{recursive:true})
writeFileSync(resolve(generated,'manifest.json'),JSON.stringify(manifest,null,2)+'\n')
writeFileSync(resolve(generated,'names.json'),JSON.stringify(Object.fromEntries(renames),null,2)+'\n')
console.log(`Compiled ${steps.length} ordered steps (${steps.filter(s=>s.probe).length} Rust probes).`)
// Deterministic artificial bodies compare Rust probes against the retained TS predicates.
const fixtures=[]
for (const scanner of getImportedScanners().filter(s=>probes[s.name])) {
  const spec=probes[scanner.name]
  const step=steps.find(s=>s.name===renames.get(scanner.name))!
  const inputs:Record<string,string|number>={'$maxHP':1234,'0':'42'}
  const candidates:number[][]=[]
  for (const length of new Set([...spec.lengths,0,1,Math.max(...spec.lengths)+1])) {
    const b=new Uint8Array(length)
    if (length>=4) new DataView(b.buffer).setUint32(0,1234,true)
    const configure=(offset:number,width:number,value:number)=>{ if(offset+width<=length) { const view=new DataView(b.buffer); if(width===2)view.setUint16(offset,value,true); else view.setUint32(offset,value,true) } }
    if(scanner.name==='UpdateHpMpTp')configure(4,2,10000)
    if(scanner.name==='UpdateClassInfo')configure(4,2,42)
    if(scanner.name==='ClientTrigger')configure(0,4,1)
    if(scanner.name==='PlayerStats'){configure(24,4,1234);configure(28,4,10000)}
    if(scanner.name==='WorldVisitQueue')configure(0,4,3)
    if(scanner.name==='ItemMarketBoardInfo')configure(16,4,123456)
    candidates.push([...b]); for(let i=0;i<b.length;i++){const variant=[...b];variant[i]^=0xff;candidates.push(variant)}
  }
  for(const body of candidates){let expected=false;try{expected=!!scanner.handler!({data:new Uint8Array(body),origin:scanner.source,header:{sourceActor:0,targetActor:0,type:0}},inputs,inputs)}catch(e){if(!(e instanceof RangeError))throw e}fixtures.push({name:scanner.name,probe:step.probe,length:step.length,body,inputs,expected})}
}
writeFileSync(resolve(generated,'probe-fixtures.json'),JSON.stringify(fixtures)+'\n')
