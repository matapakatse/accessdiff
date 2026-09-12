import assert from 'node:assert/strict';
import test from 'node:test';
import { COMMENT_MARKER, type AssessmentResult } from '../src/contract.js';
import { fetchReviewInput, publishAssessment, type GitHubConfig } from '../src/github.js';
const sha = 'a'.repeat(40), baseSha = 'b'.repeat(40);
const result: AssessmentResult = { status: 'complete', statusReason: '', baseSha, headSha: sha, path: 'src/invoices.ts', scenarios: [], finding: null, mode: 'model' };
const markdown = `${COMMENT_MARKER}\nReview`;
function config(mock: (url: string, init: RequestInit) => unknown): GitHubConfig {
  return { token: 'secret-not-for-errors', repository: 'team/demo', prNumber: 1, headSha: sha, path: result.path,
    fetch: (async (url, init) => new Response(JSON.stringify(mock(String(url), init!)), { status: 200 })) as typeof fetch };
}
test('stale head is checked immediately before publishing and makes no write', async () => {
  const calls: string[] = [];
  const c = config((url, init) => { calls.push(init.method!); if (url.includes('/comments')) return []; return { base: { sha: baseSha }, head: { sha: 'c'.repeat(40) } }; });
  await assert.rejects(publishAssessment(c, result, markdown), /stale/);
  assert.deepEqual(calls, ['GET', 'GET']);
});
test('second run updates the bot comment without duplicating; human markers are ignored', async () => {
  const comments: any[] = [{ id: 8, user: { type: 'User', login: 'maintainer' }, body: markdown }];
  const writes: string[] = [];
  const c = config((url, init) => {
    if (init.method === 'POST') { writes.push('POST'); const comment = { id: 9, user: { type: 'Bot', login: 'github-actions[bot]' }, body: JSON.parse(init.body as string).body }; comments.push(comment); return comment; }
    if (init.method === 'PATCH') { assert.ok(url.endsWith('/issues/comments/9')); writes.push('PATCH'); return comments[1]; }
    if (url.includes('/comments')) return comments;
    return { base: { sha: baseSha }, head: { sha } };
  });
  await publishAssessment(c, result, markdown);
  await publishAssessment(c, result, `${markdown}\nUpdated`);
  assert.deepEqual(writes, ['POST', 'PATCH']);
  assert.equal(comments.length, 2);
});
test('comment search follows pages and finds the bot marker', async () => {
  const c = config((url, init) => {
    if (init.method === 'PATCH') { assert.ok(url.endsWith('/issues/comments/101')); return {}; }
    if (url.includes('&page=1')) return Array.from({length: 100}, (_, i) => ({ id: i+1, user: {type:'User'}, body:'hello' }));
    if (url.includes('&page=2')) return [{ id:101, user:{type:'Bot',login:'github-actions[bot]'}, body:markdown }];
    return {base:{sha:baseSha},head:{sha}};
  });
  await publishAssessment(c, result, markdown);
});
test('fetches fixed GitHub base/head contents and validates target diff membership', async () => {
  const urls: string[] = [];
  const c = config(url => {
    urls.push(url);
    if (url.includes('/files?')) return [{filename:result.path,status:'modified'}];
    if (url.includes('/contents/')) { const content = url.includes(baseSha) ? 'old source' : 'new source'; return {type:'file',encoding:'base64',size:Buffer.byteLength(content),content:Buffer.from(content).toString('base64')}; }
    return {base:{sha:baseSha},head:{sha}};
  });
  const input = await fetchReviewInput(c);
  assert.equal(input.base, 'old source'); assert.equal(input.head, 'new source'); assert.equal(input.baseSha, baseSha);
  assert.ok(urls.every(url => url.startsWith('https://api.github.com/repos/team/demo/')));
});
test('network errors do not disclose credentials', async () => {
  const c = config(() => { throw new Error('secret-not-for-errors'); });
  await assert.rejects(fetchReviewInput(c), error => error instanceof Error && !error.message.includes(c.token));
});
