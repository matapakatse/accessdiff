import {syncFollowUp} from './ambiguous.js';
import {fetchReviewInput,publishAssessment,type GitHubConfig} from './github.js';
import {assessModel} from './model.js';
import {renderAssessment} from './render.js';
const config:GitHubConfig={token:process.env.GITHUB_TOKEN??'',repository:process.env.GITHUB_REPOSITORY??'',prNumber:Number(process.env.PR_NUMBER),headSha:process.env.HEAD_SHA??'',path:process.env.REVIEW_PATH??'fixtures/invoices.ts'};
let stage='GitHub retrieval';
try {
  const input=await fetchReviewInput(config);
  stage='model assessment';
  const result=await assessModel(input,{apiKey:process.env.OPENROUTER_API_KEY??'',model:process.env.MODEL_NAME??''});
  stage='GitHub publication';
  await publishAssessment(config,result,renderAssessment(result));
  const followUp=await syncFollowUp(result,`https://github.com/${config.repository}/pull/${config.prNumber}`,{apiKey:process.env.AMBIGUOUS_API_KEY,workspaceId:process.env.AMBIGUOUS_WORKSPACE_ID});
  console.log(`Ambiguous: ${followUp.status}. ${followUp.reason}`);
  console.log(`AccessDiff published a ${result.status} assessment.`);
  if(result.status==='failed') process.exitCode=1;
} catch (error) {
  const known = error instanceof Error && /^(GitHub request|GitHub response|Review is stale|Target is not|Target must|Assessment does not|Invalid GitHub|Comment pagination)/.test(error.message) ? error.message : 'Operation failed; no verified result.';
  console.error(`AccessDiff failed during ${stage}: ${known}`);
  process.exitCode=1;
}
