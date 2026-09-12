import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assessModel,validateModel} from '../src/model.js';
const input={base:'return invoice;',head:'return invoice;',baseSha:'base',headSha:'head',path:'invoices.ts'};
const valid=()=>({status:'complete',statusReason:'Owner remains permitted',scenarios:[{actor:'owner',before:'allowed',after:'allowed',explanation:'Both return the owner invoice.'}],finding:null});
test('validated model contract uses trusted revisions',()=>assert.equal(validateModel(valid(),input).headSha,'head'));
test('missing/wrong fields rejected',()=>{for(const x of [null,{}, {...valid(),headSha:'spoof'},{...valid(),scenarios:[]},{...valid(),statusReason:5}]) assert.throws(()=>validateModel(x,input));});
test('fabricated evidence rejected',()=>assert.throws(()=>validateModel({...valid(),finding:{title:'x',impact:'x',suggestion:'x',evidence:[{revision:'head',line:99,quote:'invented'}]}},input)));
test('unknown cannot claim complete',()=>assert.throws(()=>validateModel({...valid(),scenarios:[{actor:'owner',before:'unknown',after:'allowed',explanation:'x'}]},input)));
test('model failure and timeout never invent finding',async()=>{for(const mock of [async()=>{throw Error('secret');},async()=>new Response('{}',{status:429}),async()=>new Response('bad')]){const r=await assessModel(input,{apiKey:'secret',model:'chosen',fetch:mock as typeof fetch});assert.equal(r.status,'failed');assert.equal(r.finding,null);assert.ok(r.statusReason);assert.ok(!r.statusReason.includes('secret'));}});
test('real adapter sends configured model and accepts validated response',async()=>{const r=await assessModel(input,{apiKey:'secret',model:'chosen',fetch:(async (_url,init)=>{const b=JSON.parse(String(init?.body));assert.equal(b.model,'chosen');assert.ok(!b.messages[1].content.includes('secret'));return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(valid())}}]});}) as typeof fetch});assert.equal(r.status,'complete');});
test('genuine abort signal produces a renderable failure',async()=>{
  const {renderAssessment}=await import('../src/render.js');
  const keepAlive=setTimeout(()=>{},1000);
  try {
    const r=await assessModel(input,{apiKey:'secret',model:'chosen',timeoutMs:5,fetch:((_url,init)=>new Promise((_resolve,reject)=>{init?.signal?.addEventListener('abort',()=>reject(Error('aborted')),{once:true});})) as typeof fetch});
    assert.equal(r.status,'failed');assert.equal(r.finding,null);assert.ok(r.statusReason);
    const md=renderAssessment(r);assert.match(md,/failed/);assert.ok(!md.includes('undefined'));assert.ok(!md.includes('[object Object]'));
  } finally {clearTimeout(keepAlive);}
});
test('valid owner regression evidence accepted but wrong source line rejected',()=>{
  const regression={...valid(),scenarios:[{actor:'owner',before:'allowed',after:'denied',explanation:'Owner denied.'}],finding:{title:'Owner denied',impact:'Owner cannot read invoice',suggestion:'Restore owner access',evidence:[{revision:'head',line:1,quote:'return invoice;'}]}};
  assert.ok(validateModel(regression,input).finding);
  assert.throws(()=>validateModel({...regression,finding:{...regression.finding,evidence:[{revision:'head',line:2,quote:'return invoice;'}]}},input));
});
