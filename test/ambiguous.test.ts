import test from 'node:test';
import assert from 'node:assert/strict';
import {syncFollowUp} from '../src/ambiguous.js';
import {assessFixture,fixedFixture,vulnerableFixture} from '../src/fixture.js';
const id='11111111-1111-1111-1111-111111111111';
const input={base:fixedFixture,head:vulnerableFixture,baseSha:'base',headSha:'head',path:'invoices.ts'};
const pr='https://github.com/matapakatse/accessdiff/pull/1';
test('absent config or incomplete result makes no provider calls',async()=>{
 assert.equal((await syncFollowUp(assessFixture(input),pr,{})).status,'skipped');
 assert.equal((await syncFollowUp({...assessFixture(input),status:'incomplete'},pr,{apiKey:'secret',fetch:async()=>{throw Error('should not call');}})).status,'skipped');
});
test('create then update same follow-up, read back each time; no auto-close',async()=>{
 let task:any;let creates=0;let updates=0;
 const mock=(async(url,init)=>{
  const p=new URL(String(url)).pathname;
  if(p==='/api/users/me') return Response.json({id:'me',workspace_id:'workspace'});
  if(init?.method==='GET'&&p==='/api/tasks') return Response.json({data:task?[task]:[],has_more:false});
  if(init?.method==='POST'){creates++;task={...JSON.parse(String(init.body)),id,creator_id:'me'};return Response.json({task});}
  if(init?.method==='PATCH'){updates++;const body=JSON.parse(String(init.body));assert.ok(!('status'in body));task={...task,...body};return Response.json({task});}
  return Response.json({task});
 }) as typeof fetch;
 assert.equal((await syncFollowUp(assessFixture(input),pr,{apiKey:'secret',fetch:mock})).status,'saved');
 assert.equal((await syncFollowUp(assessFixture({...input,head:fixedFixture}),pr,{apiKey:'secret',fetch:mock})).status,'saved');
 assert.equal(creates,1);assert.equal(updates,1);assert.match(task.description,/Human confirmation/);
});
test('wrong workspace or provider error cannot expose key',async()=>{
 const r=await syncFollowUp(assessFixture(input),pr,{apiKey:'secret',workspaceId:'expected',fetch:async()=>Response.json({id:'me',workspace_id:'wrong'})});
 assert.equal(r.status,'failed');assert.ok(!r.reason.includes('secret'));
});
