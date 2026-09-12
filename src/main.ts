import {fetchReviewInput,publishAssessment,type GitHubConfig} from './github.js';
import {assessModel} from './model.js';
import {renderAssessment} from './render.js';
const config:GitHubConfig={token:process.env.GITHUB_TOKEN??'',repository:process.env.GITHUB_REPOSITORY??'',prNumber:Number(process.env.PR_NUMBER),headSha:process.env.HEAD_SHA??'',path:process.env.REVIEW_PATH??'fixtures/invoices.ts'};
try {
  const input=await fetchReviewInput(config);
  const result=await assessModel(input,{apiKey:process.env.OPENROUTER_API_KEY??'',model:process.env.MODEL_NAME??''});
  await publishAssessment(config,result,renderAssessment(result));
  console.log(`AccessDiff published a ${result.status} assessment.`);
  if(result.status==='failed') process.exitCode=1;
} catch {
  console.error('AccessDiff could not retrieve or publish this review. Check configuration, permissions, file limits and whether the PR head changed. No new result was published by this run.');
  process.exitCode=1;
}
