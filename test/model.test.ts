import {test} from 'node:test';import assert from 'node:assert/strict';import {assessModel,validateModel} from '../src/model.js';
const base=['if (!req.user) return 401;','if (invoice.customerId !== req.user.id) return 403;','return invoice;'].join('\n');
const head=['if (!req.user) return 401;','return invoice;'].join('\n');
const input={base,head,baseSha:'base',headSha:'head',path:'invoices.ts'};
const ev=(revision:'base'|'head',line:number,quote:string)=>({revision,line,quote});
const risky=():any=>({status:'complete',statusReason:'All identities assessed',scenarios:[
 {actor:'owner',before:'allowed',after:'allowed',explanation:'Owner reaches return.',evidence:[ev('base',3,'return invoice;'),ev('head',2,'return invoice;')]},
 {actor:'other_customer',before:'denied',after:'allowed',explanation:'Ownership guard removed.',evidence:[ev('base',2,'if (invoice.customerId !== req.user.id) return 403;'),ev('head',2,'return invoice;')]},
 {actor:'anonymous',before:'denied',after:'denied',explanation:'Authentication remains.',evidence:[ev('base',1,'if (!req.user) return 401;'),ev('head',1,'if (!req.user) return 401;')]}
],finding:{title:'Other customers can read invoices',impact:'Cross-customer disclosure.',suggestion:'Restore ownership check.',evidence:[ev('head',2,'return invoice;')]}});
test('accepts risky three-identity assessment and trusted metadata',()=>{const r=validateModel(risky(),input);assert.equal(r.headSha,'head');assert.equal(r.scenarios.length,3);assert.ok(r.finding);});
test('accepts fixed output using route evidence despite another helper in same file',()=>{
 const secureHead=`${head}\nfunction helper() { return invoice; }\nif (invoice.customerId !== req.user.id) return 403;`,secureInput={...input,head:secureHead},v=risky();
 v.scenarios[1]={actor:'other_customer',before:'denied',after:'denied',explanation:'Route denies mismatch.',evidence:[ev('base',2,'if (invoice.customerId !== req.user.id) return 403;'),ev('head',4,'if (invoice.customerId !== req.user.id) return 403;')]};v.finding=null;
 assert.equal(validateModel(v,secureInput).finding,null);
});
test('requires exact actors, fields, and complete trimmed source lines',()=>{
 assert.throws(()=>validateModel({...risky(),extra:true},input));assert.throws(()=>validateModel({...risky(),scenarios:risky().scenarios.slice(0,2)},input));
 const actor=risky();actor.scenarios[1].actor='owner';assert.throws(()=>validateModel(actor,input));
 const substring=risky();substring.scenarios[0].evidence[0].quote='invoice';assert.throws(()=>validateModel(substring,input));
 const line=risky();line.finding!.evidence[0].line=99;assert.throws(()=>validateModel(line,input));
});
test('requires revision evidence for every assessed judgment',()=>{
 const a=risky();a.scenarios[1].evidence=[ev('head',2,'return invoice;')];assert.throws(()=>validateModel(a,input));
 const b=risky();b.scenarios[2].evidence=[ev('base',1,'if (!req.user) return 401;')];assert.throws(()=>validateModel(b,input));
});
test('rejects contradictory status, findings, and outcomes',()=>{
 const a=risky();a.scenarios[0].before='unknown';assert.throws(()=>validateModel(a,input));
 const b=risky();b.status='incomplete';b.finding=null;assert.throws(()=>validateModel(b,input));
 const c=risky();c.scenarios[1].after='denied';assert.throws(()=>validateModel(c,input));
 const d=risky();d.finding=null;assert.throws(()=>validateModel(d,input));
});
test('unknown incomplete assessment has no finding and may omit evidence',()=>{const v=risky();v.status='incomplete';v.finding=null;for(const s of v.scenarios){s.before='unknown';s.after='unknown';s.evidence=[];}const r=validateModel(v,input);assert.equal(r.status,'incomplete');assert.equal(r.finding,null);});
test('adapter preserves configured model, JSON mode, and token limit',async()=>{const r=await assessModel(input,{apiKey:'secret',model:'chosen',fetch:(async(_url,init)=>{const b=JSON.parse(String(init?.body));assert.equal(b.model,'chosen');assert.equal(b.max_tokens,4096);assert.equal(b.response_format.type,'json_schema');assert.equal(b.response_format.json_schema.strict,true);assert.match(b.messages[0].content,/other_customer/);assert.ok(!b.messages[1].content.includes('secret'));return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(risky())}}]});}) as typeof fetch});assert.equal(r.status,'complete');});
test('malformed evidence and service failures fail closed',async()=>{const malformed=risky();malformed.scenarios[0].evidence[0].quote='fabricated';for(const mock of [async()=>Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(malformed)}}]}),async()=>{throw Error('secret');},async()=>new Response('{}',{status:429}),async()=>new Response('bad')]){const r=await assessModel(input,{apiKey:'secret',model:'chosen',fetch:mock as typeof fetch});assert.equal(r.status,'failed');assert.equal(r.finding,null);assert.ok(!r.statusReason.includes('secret'));}});
test('truncated completion differs from malformed JSON',async()=>{for(const [finish_reason,content,expected] of [['length','{',/token limit/],['stop','{',/model JSON/]] as const){const r=await assessModel(input,{apiKey:'secret',model:'chosen',fetch:(async()=>Response.json({choices:[{finish_reason,message:{content}}]})) as typeof fetch});assert.equal(r.status,'failed');assert.match(r.statusReason,expected);}});
