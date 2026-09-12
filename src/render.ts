import { COMMENT_MARKER, type AssessmentResult } from './contract.js';

/** Keep ordinary prose readable; neutralize Markdown syntax, HTML and mentions. */
export function escapeMarkdown(value: unknown): string {
  return String(value ?? '').replace(/[&<>\[\]`*_|@\\\r\n/#]/g,
    c => `&#${c.codePointAt(0)};`).replace(/^([-+])/, c => `&#${c.codePointAt(0)};`);
}

export function renderAssessment(result: AssessmentResult, repository?: string): string {
  const text = escapeMarkdown;
  const source = (revision: 'base'|'head', line: number) => {
    const sha = revision === 'base' ? result.baseSha : result.headSha;
    if (repository && /^[\w.-]+\/[\w.-]+$/.test(repository) && /^[a-f0-9]{40}$/i.test(sha) && Number.isInteger(line) && line>0) {
      return `[${revision} line ${line}](https://github.com/${repository}/blob/${sha}/${result.path.split('/').map(encodeURIComponent).join('/')}#L${line})`;
    }
    return `${text(revision)} line ${text(line)}`;
  };
  const lines = [
    COMMENT_MARKER,
    '## AccessDiff — who gains access?',
    '',
    `**Status:** ${text(result.status)} · **Mode:** ${text(result.mode)}`,
    '',
    text(result.statusReason),
    '',
    `**File:** ${text(result.path)}`,
    `**Base:** ${text(result.baseSha)} → **Head:** ${text(result.headSha)}`,
    '',
    '| Actor | Before | After | Reason |',
    '| --- | --- | --- | --- |',
    ...result.scenarios.map(s => `| ${text(s.actor)} | ${text(s.before)} | ${text(s.after)} | ${text(s.explanation)} |`),
    '',
  ];
  for (const scenario of result.scenarios) {
    for (const evidence of scenario.evidence ?? []) {
      lines.push(`- **${text(scenario.actor)} evidence:** ${source(evidence.revision,evidence.line)}: ${text(evidence.quote)}`);
    }
  }
  lines.push('');
  if (result.finding) {
    lines.push(`### ${text(result.finding.title)}`, '', text(result.finding.impact), '', `**Suggested correction:** ${text(result.finding.suggestion)}`, '', '**Evidence:**', '');
    for (const evidence of result.finding.evidence) {
      lines.push(`- ${source(evidence.revision,evidence.line)}: ${text(evidence.quote)}`);
    }
  } else {
    lines.push(result.status === 'complete' ? 'No ownership finding reported within this assessment’s scope. This is not a security approval.' : 'No conclusion: the assessment did not complete.');
  }
  lines.push('', 'Assessment of code only; application behavior has not been executed or verified by this comment.');
  return lines.join('\n');
}
