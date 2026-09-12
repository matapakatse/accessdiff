import { assessFixture, fixedFixture, vulnerableFixture } from './fixture.js';
import { renderAssessment } from './render.js';
console.log('# AccessDiff fixture demonstration\n\nThese hardcoded examples do not call a model or publish a GitHub comment. Revision labels identify fixture pairs, not Git commits. The safe unchanged example is not a helper-based secure-lookalike test.\n');
const examples = [
  {title:'Ownership check removed',base:fixedFixture,head:vulnerableFixture,baseSha:'removal-fixed-base',headSha:'removal-vulnerable-head'},
  {title:'Ownership check restored',base:vulnerableFixture,head:fixedFixture,baseSha:'repair-vulnerable-base',headSha:'repair-fixed-head'},
  {title:'Safe unchanged example',base:fixedFixture,head:fixedFixture,baseSha:'unchanged-fixed-base',headSha:'unchanged-fixed-head'},
  {title:'Incomplete: unsupported source',base:fixedFixture,head:'// Route delegates to an unavailable helper.',baseSha:'incomplete-fixed-base',headSha:'incomplete-unknown-head'},
];
for (const [index, example] of examples.entries()) {
  if(index) console.log('\n---\n');
  console.log(`## ${index+1}. ${example.title}\n`);
  console.log(renderAssessment(assessFixture({...example,path:'fixtures/invoices.ts'})));
}
