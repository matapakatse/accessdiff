import assert from 'node:assert/strict';
import test from 'node:test';
import { assessFixture, fixedFixture, vulnerableFixture } from '../src/fixture.js';
import { renderAssessment } from '../src/render.js';
import { COMMENT_MARKER } from '../src/contract.js';
const common = { path: 'invoice-route.js', baseSha: 'base', headSha: 'head' };

test('bundled removal exposes other customer and roundtrips without undefined', () => {
  const result = assessFixture({ ...common, base: fixedFixture, head: vulnerableFixture });
  assert.equal(result.mode, 'fixture');
  assert.equal(result.status, 'complete');
  assert.ok(result.finding);
  assert.deepEqual(result.scenarios.map(s => [s.before, s.after]), [['allowed', 'allowed'], ['denied', 'allowed'], ['denied', 'denied']]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  assert.ok(!renderAssessment(result).includes('undefined'));
});

test('fix and safe unchanged fixture have no finding', () => {
  for (const base of [fixedFixture, vulnerableFixture]) {
    const result = assessFixture({ ...common, base, head: fixedFixture });
    assert.equal(result.finding, null);
    assert.equal(result.scenarios[1]?.after, 'denied');
  }
});

test('arbitrary code and even modified known fixtures are incomplete', () => {
  for (const head of ['', 'arbitrary code', fixedFixture + '\n']) {
    assert.equal(assessFixture({ ...common, base: fixedFixture, head }).status, 'incomplete');
  }
  assert.equal(assessFixture({ ...common, base: 'unknown', head: fixedFixture }).status, 'incomplete');
});

test('untrusted content cannot inject mentions, HTML, links or table rows', () => {
  const result = assessFixture({ ...common, base: fixedFixture, head: vulnerableFixture });
  const hostile = '@everyone [click](https://evil.test) <img src=x>\n| forged | `code` ![image](x)';
  result.statusReason = hostile;
  result.path = hostile;
  result.finding!.title = hostile;
  result.finding!.impact = hostile;
  result.finding!.suggestion = hostile;
  result.finding!.evidence[0]!.quote = hostile;
  result.scenarios[0]!.explanation = hostile;
  const output = renderAssessment(result);
  assert.ok(output.startsWith(COMMENT_MARKER));
  for (const unsafe of ['@everyone', '[click]', '<img', '\n| forged', '`code`', '![image]']) assert.ok(!output.includes(unsafe));
  assert.ok(output.includes('&#64;everyone'));
});

test('non-findings explain denial and cite the actual guard in reviewed source',()=>{
  for(const base of [vulnerableFixture,fixedFixture]) {
    const result=assessFixture({...common,base,head:fixedFixture});
    const scenario=result.scenarios.find(s=>s.actor==='other_customer')!;
    assert.match(scenario.explanation,base===vulnerableFixture?/added ownership check now returns 403/:/in both revisions/);
    assert.equal(scenario.evidence?.length,base===vulnerableFixture?1:2);
    for(const e of scenario.evidence??[]) assert.equal((e.revision==='base'?base:fixedFixture).split('\n')[e.line-1]?.trim(),e.quote);
    const markdown=renderAssessment(result);
    assert.match(markdown,/head line 5:/);
    assert.ok(markdown.includes('403'));
    assert.equal(result.finding,null);
  }
});
test('incomplete fixture renders an honest conclusion and readable punctuation',()=>{
  const result=assessFixture({...common,base:fixedFixture,head:'unknown'});
  const markdown=renderAssessment(result);
  assert.match(markdown,/incomplete/);assert.match(markdown,/No conclusion/);
  assert.ok(!markdown.includes('undefined'));assert.ok(!markdown.includes('[object Object]'));
  assert.ok(markdown.includes('invoice-route.js'));
  for(const entity of ['&#46;','&#45;','&#58;']) assert.ok(!markdown.includes(entity));
});
