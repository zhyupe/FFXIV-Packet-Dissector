import { test,expect } from '@playwright/test'

test('out-of-order state snapshots cannot kill a newer worker task',async({page})=>{
  await page.goto('/')
  const result=await page.evaluate(async()=>{
    const modulePath='/src/worker-client.ts'; const {WorkerClient}=await import(/* @vite-ignore */ modulePath)
    const workers:any[]=[];const calls:any[]=[]
    const create=()=>{const worker:any={onmessage:null,onerror:null,terminated:false,terminate(){this.terminated=true},postMessage(){}};workers.push(worker);return worker}
    const client=new WorkerClient(async(...args:any[])=>{calls.push(args)},create)
    const encode=(token:number)=>{const json=new TextEncoder().encode(JSON.stringify({version:1,sessionId:1,runId:1,inputGeneration:token,packetSequence:String(token)}));const bytes=new Uint8Array(4+json.length);new DataView(bytes.buffer).setUint32(0,json.length,true);bytes.set(json,4);return bytes.buffer}
    client.receive(encode(2))
    client.state({sessionId:1,wizard:{inputToken:1,status:'input'}} as any)
    const survived=!workers[0].terminated
    client.receive(encode(3));const cancelled=workers[0].terminated
    workers[0].onerror();const noStaleFailure=calls.length===0
    client.state({sessionId:1,wizard:{inputToken:3,status:'stopped'}} as any)
    const stopped=workers[1].terminated;client.dispose()
    return {survived,cancelled,noStaleFailure,stopped}
  })
  expect(result).toEqual({survived:true,cancelled:true,noStaleFailure:true,stopped:true})
})
