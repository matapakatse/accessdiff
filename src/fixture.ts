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
      { actor: 'other_customer', before: baseExposed ? 'allowed' : 'denied', after: headExposed ? 'allowed' : 'denied', explanation: headExposed ? 'The ownership check is absent in head, so another authenticated customer can receive the invoice.' : baseExposed ? 'The added ownership check now returns 403 before another customer can receive the invoice.' : 'The ownership check returns 403 for another customer in both revisions.', evidence: headExposed ? [] : [{ revision: 'head', line: 5, quote: 'if (invoice.customerId !== req.user.id) return { status: 403 };' }, ...(!baseExposed ? [{ revision: 'base' as const, line: 5, quote: 'if (invoice.customerId !== req.user.id) return { status: 403 };' }] : [])] },
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
