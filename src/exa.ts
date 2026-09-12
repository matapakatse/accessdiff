import type {AssessmentResult} from './contract.js';
import {escapeMarkdown} from './render.js';

export type ExaResearch={
  status:'skipped'|'completed'|'pending'|'failed';
  reason:string;
  summary?:string;
  controls?:string[];
  sources?:Array<{title:string;url:string}>;
};

export interface ExaOptions {
  apiKey?:string;
  fetch?:typeof fetch;
  wait?:()=>Promise<void>;
  maxPolls?:number;
}

function record(value:unknown):Record<string,unknown>{
  if(!value||typeof value!=='object'||Array.isArray(value)) throw Error('Invalid Exa response');
  return value as Record<string,unknown>;
}

function completed(run:Record<string,unknown>):ExaResearch{
  const output=record(run.output);
  const structured=record(output.structured);
  if(typeof structured.summary!=='string'||!structured.summary.trim()||structured.summary.length>1200) throw Error('Invalid Exa summary');
  if(!Array.isArray(structured.controls)||structured.controls.length<1||structured.controls.length>4||structured.controls.some(x=>typeof x!=='string'||!x.trim()||x.length>500)) throw Error('Invalid Exa controls');
  if(!Array.isArray(output.grounding)) throw Error('Missing Exa grounding');
  const sources:Array<{title:string;url:string}>=[];
  for(const group of output.grounding){
    const item=record(group);
    if(!Array.isArray(item.citations)) continue;
    for(const raw of item.citations){
      const citation=record(raw);
      if(typeof citation.url!=='string') continue;
      const url=new URL(citation.url);
      if(url.protocol!=='https:') continue;
      const title=typeof citation.title==='string'&&citation.title.trim()?citation.title.trim().slice(0,200):url.hostname;
      if(!sources.some(source=>source.url===url.toString())) sources.push({title,url:url.toString()});
    }
  }
  if(!sources.length) throw Error('No grounded Exa sources');
  return {status:'completed',reason:'Exa returned grounded remediation research.',summary:structured.summary.trim(),controls:(structured.controls as string[]).map(x=>x.trim()),sources:sources.slice(0,3)};
}

export async function researchFinding(result:AssessmentResult,options:ExaOptions):Promise<ExaResearch>{
  if(!result.finding) return {status:'skipped',reason:'No finding requires external remediation research.'};
  if(!options.apiKey) return {status:'skipped',reason:'Exa is not configured.'};
  const request=options.fetch??fetch;
  const headers={'x-api-key':options.apiKey,'Content-Type':'application/json','Exa-Beta':'agent-2026-05-07'};
  try{
    const created=await request('https://api.exa.ai/agent/runs',{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers,body:JSON.stringify({
      query:`Find current authoritative defensive guidance for this access-control finding: ${result.finding.title}. Impact: ${result.finding.impact}. Proposed correction: ${result.finding.suggestion}`,
      systemPrompt:'Use primary authoritative security sources such as OWASP or official framework documentation. Focus on defensive remediation. Do not provide exploit steps.',
      effort:'minimal',
      outputSchema:{type:'object',additionalProperties:false,required:['summary','controls'],properties:{summary:{type:'string'},controls:{type:'array',minItems:1,maxItems:4,items:{type:'string'}}}},
    })});
    if(!created.ok) return {status:'failed',reason:`Exa returned HTTP ${created.status}; the AccessDiff finding is unchanged.`};
    let run=record(await created.json());
    if(typeof run.id!=='string'||!/^agent_run_[A-Za-z0-9_.:-]+$/.test(run.id)) throw Error('Invalid Exa run');
    const runId=run.id;
    const maxPolls=options.maxPolls??24;
    for(let attempt=0;attempt<=maxPolls;attempt++){
      if(run.status==='completed') return completed(run);
      if(run.status==='failed'||run.status==='cancelled') return {status:'failed',reason:'Exa research did not complete; the AccessDiff finding is unchanged.'};
      if(attempt===maxPolls) break;
      await (options.wait??(()=>new Promise(resolve=>setTimeout(resolve,1250))))();
      const polled=await request(`https://api.exa.ai/agent/runs/${encodeURIComponent(runId)}`,{method:'GET',redirect:'error',signal:AbortSignal.timeout(10000),headers});
      if(!polled.ok) return {status:'failed',reason:`Exa returned HTTP ${polled.status}; the AccessDiff finding is unchanged.`};
      run=record(await polled.json());
    }
    return {status:'pending',reason:'Exa research is still running; the AccessDiff finding was published without it.'};
  }catch{
    return {status:'failed',reason:'Exa research failed safely; the AccessDiff finding is unchanged.'};
  }
}

export function renderExaResearch(research:ExaResearch):string{
  if(research.status!=='completed'||!research.summary||!research.controls||!research.sources) return '';
  const lines=['','### Current remediation guidance from Exa Agent','',escapeMarkdown(research.summary),'','**Recommended controls:**',''];
  for(const control of research.controls) lines.push(`- ${escapeMarkdown(control)}`);
  lines.push('','**Grounded sources:**','');
  for(const source of research.sources) lines.push(`- [${escapeMarkdown(source.title)}](<${source.url}>)`);
  lines.push('','Exa researched public guidance after AccessDiff established the code finding; it did not determine the finding itself.');
  return lines.join('\n');
}
