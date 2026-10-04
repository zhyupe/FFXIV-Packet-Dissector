import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import manifest from '../../../wizard/generated/manifest.json' with {type:'json'}

test('browser Worker executes actual rules and rejects a mismatched pack', async ({page})=>{
  await page.goto('/')
  const name=manifest.steps.find(s=>s.name==='SetSearchInfo')?.name || 'SetSearchInfoHandler'
  const path='/@fs'+fileURLToPath(new URL('../../../wizard/src/worker/entry.mts',import.meta.url))+'?worker'
  const results=await page.evaluate(async ({hash,name,path})=>{
    const {default: Constructor}=await import(/* @vite-ignore */ path)
    const worker:Worker=new Constructor()
    const run=(ruleHash:string)=>new Promise<any>((resolve,reject)=>{
      const timeout=setTimeout(()=>reject(new Error('Worker did not respond')),3000)
      worker.onmessage=e=>{clearTimeout(timeout);resolve(e.data)}
      worker.onerror=()=>{clearTimeout(timeout);reject(new Error('Worker crashed'))}
      const task={version:1,sessionId:1,runId:1,inputGeneration:1,rulePackHash:ruleHash,ruleId:name,packetSequence:'1',sourceActor:0,targetActor:0,inputs:{$searchText:'synthetic-search'},context:{$searchText:'synthetic-search'}}
      const json=new TextEncoder().encode(JSON.stringify(task)); const body=new TextEncoder().encode('synthetic-search')
      const bytes=new Uint8Array(4+json.length+body.length);new DataView(bytes.buffer).setUint32(0,json.length,true);bytes.set(json,4);bytes.set(body,4+json.length)
      worker.postMessage(bytes.buffer,[bytes.buffer])
    })
    try { return [await run(hash),await run('0'.repeat(64))] } finally { worker.terminate() }
  },{hash:manifest.hash,name,path})
  expect(results[0].matched).toBe(true)
  expect(results[0].error).toBe(false)
  expect(results[1].error).toBe(true)
})
