import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getScanners } from '../src/scanner/index.mjs'
import { execute } from '../src/worker/executor.mjs'
import manifest from '../generated/manifest.json' with {type:'json'}
import type { WorkerTask } from '@ffxiv/contracts'
function task(ruleId:string,inputs:Record<string,string|number>={},context=inputs):WorkerTask { return {version:1,sessionId:1,runId:1,inputGeneration:1,rulePackHash:manifest.hash,ruleId,packetSequence:'1',sourceActor:0,targetActor:0,inputs,context} }
test('shared dependencies are declared including former closure state',()=>{
  const scanners=getScanners()
  for (const [name,key] of [['PlayerStats','$maxHP'],['UpdateSearchInfo','$searchText'],['CurrencyCrystalInfo','$lightningCrystals'],['NpcSpawn','$retainerName'],['AirshipStatus','$airshipName']]) assert(scanners.find(s=>s.name===name)?.fields.some(f=>f.key===key),name)
})
test('search input changes do not reuse a stale closure',()=>{
  const rule=manifest.steps.find(s=>s.name==='SetSearchInfo')?.name || manifest.steps.find(s=>s.name==='SetSearchInfoHandler')!.name
  const body=new TextEncoder().encode('synthetic-first')
  assert(execute(task(rule,{$searchText:'synthetic-first'}),body).matched)
  assert(!execute(task(rule,{$searchText:'synthetic-second'}),body).matched)
})
test('worker rejects mismatched rule pack and unknown rules',()=>{
  const t=task('PlayerSetup',{$playerName:'synthetic'}); t.rulePackHash='b'.repeat(64)
  assert(execute(t,new Uint8Array(300)).error)
  assert(execute(task('Missing'),new Uint8Array()).error)
})
test('short candidate is a miss rather than a worker crash',()=>{
  const rule=manifest.steps.find(s=>s.name==='ActorCast')!
  const r=execute(task(rule.name,{$lightningCrystals:123}),new Uint8Array(1)); assert(!r.matched); assert(!r.error)
})
test('inventory operation context is returned as an explicit update',()=>{
  const scanner=getScanners().find(s=>s.name==='InventoryTransaction')!
  const body=new Uint8Array(48); const data=new DataView(body.buffer)
  // Synthetic material identifier selected from the rule's public constants.
  data.setUint16(24,5267,true); data.setUint32(0,456,true)
  const context:Record<string,string|number>={}; scanner.handler!({data:body,origin:'S',header:{sourceActor:0,targetActor:0,type:0}},{},context)
  const r=execute(task('InventoryTransaction'),body)
  assert(r.matched); assert.equal(r.updates?.inventoryOperation,456)
})
