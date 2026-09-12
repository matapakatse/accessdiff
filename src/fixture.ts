import { readFileSync } from 'node:fs';
import type { AssessmentResult, ReviewInput } from './contract.js';

export const fixedFixture = readFileSync(new URL('../fixtures/invoice-fixed.txt', import.meta.url), 'utf8');
export const vulnerableFixture = readFileSync(new URL('../fixtures/invoice-vulnerable.txt', import.meta.url), 'utf8');

/** A deterministic presentation fixture, not a scanner or model assessment. */
export function assessFixture(input: ReviewInput): AssessmentResult {
  const known = (source: string) => source === fixedFixture || source === vulnerableFixture;
  const common = { baseSha: input.baseSha, headSha: input.headSha, path: input.path, mode: 'fixture' as const };
  if (!known(input.base) || !known(input.head)) {
    return { ...common, status: 'incomplete', statusReason: 'Fixture mode accepts only the exact bundled invoice examples; arbitrary code has not been assessed.', scenarios: [], finding: null };
  }
  const baseExposed = input.base === vulnerableFixture;
  const headExposed = input.head === vulnerableFixture;
  return {
    ...common,
    status: 'complete',
    statusReason: 'Hardcoded demonstration of the bundled fixtures. No model ran and no application requests were executed.',
    scenarios: [
      { actor: 'owner', before: 'allowed', after: 'allowed', explanation: 'Assumes a valid authenticated owner and an existing invoice.' },
      { actor: 'other_customer', before: baseExposed ? 'allowed' : 'denied', after: headExposed ? 'allowed' : 'denied', explanation: 'An authenticated customer who knows another existing invoice ID reaches the return when ownership is not checked.' },
      { actor: 'anonymous', before: 'denied', after: 'denied', explanation: 'Both bundled routes return 401 before querying when req.user is absent.' },
    ],
    finding: headExposed ? {
      title: 'Another authenticated customer can read the invoice',
      impact: 'For this example, knowing an existing invoice ID permits access to another customer’s invoice.',
      suggestion: 'Before returning the invoice, deny access when invoice.customerId differs from req.user.id.',
      evidence: [
        { revision: 'head', line: 2, quote: 'if (!req.user) return { status: 401 };' },
        { revision: 'head', line: 3, quote: 'const invoice = await db.invoice.findUnique({ where: { id: req.params.id } });' },
        { revision: 'head', line: 5, quote: 'return { status: 200, body: invoice };' },
      ],
    } : null,
  };
}
