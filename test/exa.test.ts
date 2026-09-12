import test from 'node:test';
import assert from 'node:assert/strict';
import {researchFinding,renderExaResearch} from '../src/exa.js';
import {assessFixture,fixedFixture,vulnerableFixture} from '../src/fixture.js';

const finding=assessFixture({base:fixedFixture,head:vulnerableFixture,baseSha:'base',headSha:'head',path:'fixtures/invoices.ts'});

test('Exa skips without a finding or key',async()=>{
  const never=async()=>{throw Error('must not call');};
  assert.equal((await researchFinding({...finding,finding:null},{apiKey:'secret',fetch:never as typeof fetch})).status,'skipped');
  assert.equal((await researchFinding(finding,{fetch:never as typeof fetch})).status,'skipped');
});

test('Exa Agent creates, polls and renders grounded remediation research',async()=>{
  let calls=0;
  const mock=(async(url,init)=>{
    calls++;
    assert.equal((init?.headers as Record<string,string>)['Exa-Beta'],'agent-2026-05-07');
    assert.equal((init?.headers as Record<string,string>)['x-api-key'],'secret');
    if(String(url).endsWith('/agent/runs')){
      const body=JSON.parse(String(init?.body));
      assert.equal(body.effort,'minimal');
      assert.match(body.systemPrompt,/defensive remediation/);
      return Response.json({id:'agent_run_test',status:'running'});
    }
    return Response.json({id:'agent_run_test',status:'completed',output:{structured:{summary:'Check ownership on every object request.',controls:['Compare the resource owner with the authenticated user.']},grounding:[{citations:[{title:'OWASP Authorization guidance',url:'https://owasp.org/example'}]}]}});
  }) as typeof fetch;
  const result=await researchFinding(finding,{apiKey:'secret',fetch:mock,wait:async()=>{},maxPolls:1});
  assert.equal(result.status,'completed');assert.equal(calls,2);
  const rendered=renderExaResearch(result);
  assert.match(rendered,/Current remediation guidance from Exa Agent/);
  assert.match(rendered,/owasp\.org/);
});

test('Exa failures and ungrounded output fail safely without exposing the key',async()=>{
  const failed=await researchFinding(finding,{apiKey:'secret',fetch:(async()=>new Response('{}',{status:429})) as typeof fetch});
  assert.equal(failed.status,'failed');assert.ok(!failed.reason.includes('secret'));
  const ungrounded=await researchFinding(finding,{apiKey:'secret',fetch:(async()=>Response.json({id:'agent_run_test',status:'completed',output:{structured:{summary:'text',controls:['control']},grounding:[]}})) as typeof fetch});
  assert.equal(ungrounded.status,'failed');
});
