import {readFile} from 'node:fs/promises';
import {assessModel} from './model.js';
import {renderAssessment} from './render.js';
const [base,head]=process.argv.slice(2);
if(!base||!head) throw Error('Usage: npm run live -- BASE_FILE HEAD_FILE');
const result=await assessModel({base:await readFile(base,'utf8'),head:await readFile(head,'utf8'),baseSha:'local-base',headSha:'local-head',path:head},{apiKey:process.env.OPENROUTER_API_KEY??'',model:process.env.MODEL_NAME??''});
console.log(renderAssessment(result));
if(result.status==='failed') process.exitCode=1;
