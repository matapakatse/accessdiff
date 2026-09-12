import { Buffer } from 'node:buffer';
import { COMMENT_MARKER, type AssessmentResult, type ReviewInput } from './contract.js';

export interface GitHubConfig {
  token: string;
  repository: string;
  prNumber: number;
  headSha: string;
  path: string;
  fetch?: typeof fetch;
}
const API = 'https://api.github.com';
const SOURCE_LIMIT = 80 * 1024;
const MAX_PAGES = 10;

function validate(config: GitHubConfig): void {
  if (!config.token || !/^[\w.-]+\/[\w.-]+$/.test(config.repository)
    || !Number.isSafeInteger(config.prNumber) || config.prNumber < 1
    || !/^[a-f0-9]{40}$/i.test(config.headSha)
    || !config.path || config.path.startsWith('/') || config.path.split('/').some(p => !p || p === '..' || p === '.')) {
    throw new Error('Invalid GitHub review configuration.');
  }
}
async function request(config: GitHubConfig, path: string, options: { method?: string; body?: unknown; diff?: boolean } = {}): Promise<any> {
  let response: Response;
  try {
    response = await (config.fetch ?? fetch)(`${API}/repos/${config.repository}${path}`, {
      method: options.method ?? 'GET', redirect: 'error', signal: AbortSignal.timeout(20_000),
      headers: { Authorization: `Bearer ${config.token}`, Accept: options.diff ? 'application/vnd.github.diff' : 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });
  } catch { throw new Error('GitHub request could not be completed.'); }
  if (!response.ok) throw new Error(`GitHub request failed (HTTP ${response.status}).`);
  const limit = options.diff ? SOURCE_LIMIT : 2 * 1024 * 1024;
  if (Number(response.headers.get('content-length')) > limit) throw new Error('GitHub response exceeds review limits.');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('GitHub returned an empty response.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > limit) { await reader.cancel(); throw new Error('limit'); }
      chunks.push(next.value);
    }
  } catch { throw new Error('GitHub response exceeds limits or could not be read.'); }
  const text = Buffer.concat(chunks).toString('utf8');
  if (options.diff) return text;
  try { return JSON.parse(text); } catch { throw new Error('GitHub returned invalid JSON.'); }
}
async function currentPr(config: GitHubConfig): Promise<{base: {sha: string}; head: {sha: string}}> {
  const pr = await request(config, `/pulls/${config.prNumber}`);
  if (pr?.head?.sha !== config.headSha) throw new Error('Review is stale: the pull request head changed.');
  if (!/^[a-f0-9]{40}$/i.test(pr?.base?.sha ?? '')) throw new Error('GitHub returned an invalid base revision.');
  return pr;
}
async function fileAt(config: GitHubConfig, sha: string): Promise<string> {
  const path = config.path.split('/').map(encodeURIComponent).join('/');
  const file = await request(config, `/contents/${path}?ref=${encodeURIComponent(sha)}`);
  if (file?.type !== 'file' || file.encoding !== 'base64' || typeof file.content !== 'string'
    || !Number.isInteger(file.size) || file.size > SOURCE_LIMIT || file.size < 0) {
    throw new Error('Target must be an available text file within the 80 KiB limit.');
  }
  const bytes = Buffer.from(file.content, 'base64');
  if (bytes.byteLength > SOURCE_LIMIT || bytes.byteLength !== file.size || bytes.includes(0)) throw new Error('Target file exceeds limits or is not text.');
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error('Target file is not valid UTF-8 text.'); }
}

/** Uses PR base.sha as the explicit baseline, rather than claiming a merge-base comparison. */
export async function fetchReviewInput(config: GitHubConfig): Promise<ReviewInput> {
  validate(config);
  const pr = await currentPr(config);
  // Bound the complete PR diff. Large PRs are deliberately unsupported by this prototype.
  await request(config, `/pulls/${config.prNumber}`, { diff: true });
  let changed = false;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const files = await request(config, `/pulls/${config.prNumber}/files?per_page=100&page=${page}`);
    if (!Array.isArray(files)) throw new Error('GitHub returned invalid changed files.');
    if (files.some(file => file.filename === config.path && file.status !== 'removed' && file.status !== 'added' && file.status !== 'renamed')) { changed = true; break; }
    if (files.length < 100) break;
  }
  if (!changed) throw new Error('Target is not a changed existing file within the review limits.');
  const [base, head] = await Promise.all([fileAt(config, pr.base.sha), fileAt(config, config.headSha)]);
  await currentPr(config);
  return { base, head, baseSha: pr.base.sha, headSha: config.headSha, path: config.path };
}

/** Updates only the GitHub Actions bot's marker comment; human-authored markers are ignored. */
export async function publishAssessment(config: GitHubConfig, result: AssessmentResult, markdown: string): Promise<void> {
  validate(config);
  if (result.headSha !== config.headSha || result.path !== config.path) throw new Error('Assessment does not match the requested revision and path.');
  if (!markdown.startsWith(COMMENT_MARKER) || Buffer.byteLength(markdown, 'utf8') > 60_000) throw new Error('Invalid or oversized review comment.');
  let commentId: number | undefined;
  let complete = false;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const comments = await request(config, `/issues/${config.prNumber}/comments?per_page=100&page=${page}`);
    if (!Array.isArray(comments)) throw new Error('GitHub returned invalid comments.');
    const own = comments.find(c => c?.user?.type === 'Bot' && c.user.login === 'github-actions[bot]'
      && typeof c.body === 'string' && c.body.startsWith(COMMENT_MARKER) && Number.isSafeInteger(c.id) && c.id > 0);
    if (own) { commentId = own.id; complete = true; break; }
    if (comments.length < 100) { complete = true; break; }
  }
  if (!complete) throw new Error('Comment pagination limit reached; refusing to create a duplicate.');
  // Last read before the write; GitHub has no atomic conditional issue-comment write.
  await currentPr(config);
  await request(config, commentId === undefined ? `/issues/${config.prNumber}/comments` : `/issues/comments/${commentId}`, {
    method: commentId === undefined ? 'POST' : 'PATCH', body: { body: markdown },
  });
}
