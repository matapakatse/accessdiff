import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
// Executes only our bundled trusted synthetic fixtures, never fetched PR code.
for(const [name,expected] of [['fixed',[200,403,401]],['vulnerable',[200,200,401]],['helper',[200,403,401]]] as const){
 test(`trusted ${name} fixture enforces expected actor outcomes`,async()=>{
  const source=await readFile(new URL(`../fixtures/invoice-${name}.txt`,import.meta.url),'utf8');
  const {getInvoice}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const actual=[];
  for(const user of [{id:'owner'},{id:'other'},undefined])actual.push((await getInvoice({user,params:{id:'invoice'}},{invoice:{findUnique:async()=>({id:'invoice',customerId:'owner'})}})).status);
  assert.deepEqual(actual,expected);
 });
}
