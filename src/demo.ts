import { assessFixture, fixedFixture, vulnerableFixture } from './fixture.js';
import { renderAssessment } from './render.js';

const common = { path: 'invoice-route.js', baseSha: 'demo-base', headSha: 'demo-head' };
console.log('# AccessDiff fixture demonstration\n\nThis local demonstration uses hardcoded known examples. It does not call a model or publish a GitHub comment.\n');
console.log('## 1. Ownership check removed\n');
console.log(renderAssessment(assessFixture({ ...common, base: fixedFixture, head: vulnerableFixture })));
console.log('\n---\n\n## 2. Ownership check restored\n');
console.log(renderAssessment(assessFixture({ ...common, base: vulnerableFixture, head: fixedFixture })));
console.log('\n---\n\n## 3. Safe unchanged example\n');
console.log(renderAssessment(assessFixture({ ...common, base: fixedFixture, head: fixedFixture })));
