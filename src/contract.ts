export const COMMENT_MARKER = '<!-- accessdiff-review-v1 -->';
export type Access = 'allowed' | 'denied' | 'unknown';
export type Actor = 'owner' | 'other_customer' | 'anonymous';
export interface Evidence { revision: 'base' | 'head'; line: number; quote: string }
export interface Scenario { actor: Actor; before: Access; after: Access; explanation: string }
export interface Finding { title: string; impact: string; suggestion: string; evidence: Evidence[] }
export interface AssessmentResult {
  status: 'complete' | 'incomplete' | 'failed';
  statusReason: string;
  baseSha: string;
  headSha: string;
  path: string;
  scenarios: Scenario[];
  finding: Finding | null;
  mode: 'fixture' | 'model';
}
export interface ReviewInput { base: string; head: string; baseSha: string; headSha: string; path: string }
export function failure(input: ReviewInput, reason: string): AssessmentResult {
  return { status: 'failed', statusReason: reason, baseSha: input.baseSha, headSha: input.headSha,
    path: input.path, scenarios: [], finding: null, mode: 'model' };
}
