import {createHash} from 'node:crypto';
import type {AssessmentResult} from './contract.js';
import {escapeMarkdown} from './render.js';
export interface AmbiguousOptions {apiKey?:string; workspaceId?:string; fetch?:typeof fetch}
export interface FollowUp {status:'skipped'|'saved'|'failed'; reason:string; taskId?:string}
// Official REST schema: https://app.ambiguous.ai/api/openapi.json
export async function syncFollowUp(result:AssessmentResult, prUrl:string, options:AmbiguousOptions):Promise<FollowUp> {
 if(!options.apiKey) return {status:'skipped',reason:'Ambiguous is not configured.'};
 if(result.status!=='complete') return {status:'skipped',reason:'No complete assessment to sync.'};
 if(!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/[1-9][0-9]*$/.test(prUrl)) return {status:'failed',reason:'Invalid PR URL.'};
 const marker='AccessDiff-'+createHash('sha256').update(prUrl+'\n'+result.path).digest('hex').slice(0,20);
 async function request(path:string,method='GET',body?:unknown):Promise<any>{
  const r=await (options.fetch??fetch)('https://app.ambiguous.ai'+path,{method,redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${options.apiKey}`,'Content-Type':'application/json','API-Version':'1'},...(body?{body:JSON.stringify(body)}:{})});
  if(!r.ok) throw Error('Provider request failed');
  return r.json();
 }
 try {
  const identity=await request('/api/users/me');
  if(typeof identity?.id!=='string'||!identity.workspace_id||identity.needs_workspace_setup || (options.workspaceId && identity.workspace_id!==options.workspaceId)) throw Error('Workspace unavailable');
  const existing=await request('/api/tasks?q='+encodeURIComponent(marker)+'&limit=100');
  if(!Array.isArray(existing?.data)||existing.has_more!==false) throw Error('Incomplete task lookup');
  const title=`[${marker}] Review invoice access`;
  const matches=existing.data.filter((t:any)=>t.title===title&&t.creator_id===identity.id);
  if(matches.length>1) throw Error('Duplicate tasks require human review');
  const task=matches[0];
  if(!result.finding&&!task) return {status:'skipped',reason:'No finding and no existing follow-up.'};
  const state=result.finding?'Potential access violation: needs human review.':'Latest assessment reports no violation. Human confirmation is required before closing.';
  const evidence=result.scenarios.flatMap(s=>(s.evidence??[]).map(e=>`${s.actor}: ${e.revision} line ${e.line}: ${e.quote}`));
  const description=[marker,prUrl,`Reviewed commit: ${result.headSha}`,state,...evidence,...(result.finding?[result.finding.impact,result.finding.suggestion]:[])].map(escapeMarkdown).join('\n\n');
  let saved;
  if(task){
   if(typeof task.id!=='string'||!/^[a-f0-9-]{36}$/i.test(task.id)) throw Error('Invalid task ID');
   saved=await request('/api/tasks/'+task.id,'PATCH',{description});
  } else saved=await request('/api/tasks','POST',{title,description,status:'todo'});
  const id=saved?.task?.id;
  if(typeof id!=='string'||!/^[a-f0-9-]{36}$/i.test(id)) throw Error('Invalid task response');
  const readBack=await request('/api/tasks/'+id);
  if(readBack?.task?.id!==id||readBack.task.description!==description) throw Error('Read back failed');
  return {status:'saved',reason:'Follow-up saved and read back. Human confirmation controls closure.',taskId:id};
 } catch {return {status:'failed',reason:'Ambiguous sync failed. Check workspace, task permissions and provider availability; review result is unchanged.'};}
}
