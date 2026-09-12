import { COMMENT_MARKER, type AssessmentResult } from './contract.js';

/** Render every untrusted character as an entity, including punctuation and mentions.
 * Entities are rendered as text by Markdown; they cannot become links or raw HTML.
 */
export function escapeMarkdown(value: unknown): string {
  return Array.from(String(value ?? ''), c => {
    const point = c.codePointAt(0)!;
    return /[a-zA-Z0-9 ]/.test(c) ? c : `&#${point};`;
  }).join('');
}

export function renderAssessment(result: AssessmentResult): string {
  const text = escapeMarkdown;
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
  if (result.finding) {
    lines.push(`### ${text(result.finding.title)}`, '', text(result.finding.impact), '', `**Suggested correction:** ${text(result.finding.suggestion)}`, '', '**Evidence:**', '');
    for (const evidence of result.finding.evidence) {
      lines.push(`- ${text(evidence.revision)} line ${text(evidence.line)}: ${text(evidence.quote)}`);
    }
  } else {
    lines.push(result.status === 'complete' ? 'No ownership finding reported within this assessment’s scope. This is not a security approval.' : 'No conclusion: the assessment did not complete.');
  }
  lines.push('', 'Assessment of code only; application behavior has not been executed or verified by this comment.');
  return lines.join('\n');
}
