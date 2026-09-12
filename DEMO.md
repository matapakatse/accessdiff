# AccessDiff fixture demonstration

These hardcoded examples do not call a model or publish a GitHub comment. Revision labels identify fixture pairs, not Git commits. The safe unchanged example is not a helper-based secure-lookalike test.

## 1. Ownership check removed

<!-- accessdiff-review-v1 -->
## AccessDiff — who gains access?

**Status:** complete · **Mode:** fixture

Hardcoded demonstration of the bundled fixtures. No model ran and no application requests were executed.

**File:** fixtures&#47;invoices.ts
**Base:** removal-fixed-base → **Head:** removal-vulnerable-head

| Actor | Before | After | Reason |
| --- | --- | --- | --- |
| owner | allowed | allowed | Assumes a valid authenticated owner and an existing invoice. |
| other&#95;customer | denied | allowed | The ownership check is absent in head, so another authenticated customer can receive the invoice. |
| anonymous | denied | denied | Both bundled routes return 401 before querying when req.user is absent. |


### Another authenticated customer can read the invoice

For this example, knowing an existing invoice ID permits access to another customer’s invoice.

**Suggested correction:** Before returning the invoice, deny access when invoice.customerId differs from req.user.id.

**Evidence:**

- head line 2: if (!req.user) return { status: 401 };
- head line 3: const invoice = await db.invoice.findUnique({ where: { id: req.params.id } });
- head line 5: return { status: 200, body: invoice };

Assessment of code only; application behavior has not been executed or verified by this comment.

---

## 2. Ownership check restored

<!-- accessdiff-review-v1 -->
## AccessDiff — who gains access?

**Status:** complete · **Mode:** fixture

Hardcoded demonstration of the bundled fixtures. No model ran and no application requests were executed.

**File:** fixtures&#47;invoices.ts
**Base:** repair-vulnerable-base → **Head:** repair-fixed-head

| Actor | Before | After | Reason |
| --- | --- | --- | --- |
| owner | allowed | allowed | Assumes a valid authenticated owner and an existing invoice. |
| other&#95;customer | allowed | denied | The added ownership check now returns 403 before another customer can receive the invoice. |
| anonymous | denied | denied | Both bundled routes return 401 before querying when req.user is absent. |

- **other&#95;customer evidence:** head line 5: if (invoice.customerId !== req.user.id) return { status: 403 };

No ownership finding reported within this assessment’s scope. This is not a security approval.

Assessment of code only; application behavior has not been executed or verified by this comment.

---

## 3. Safe unchanged example

<!-- accessdiff-review-v1 -->
## AccessDiff — who gains access?

**Status:** complete · **Mode:** fixture

Hardcoded demonstration of the bundled fixtures. No model ran and no application requests were executed.

**File:** fixtures&#47;invoices.ts
**Base:** unchanged-fixed-base → **Head:** unchanged-fixed-head

| Actor | Before | After | Reason |
| --- | --- | --- | --- |
| owner | allowed | allowed | Assumes a valid authenticated owner and an existing invoice. |
| other&#95;customer | denied | denied | The ownership check returns 403 for another customer in both revisions. |
| anonymous | denied | denied | Both bundled routes return 401 before querying when req.user is absent. |

- **other&#95;customer evidence:** head line 5: if (invoice.customerId !== req.user.id) return { status: 403 };
- **other&#95;customer evidence:** base line 5: if (invoice.customerId !== req.user.id) return { status: 403 };

No ownership finding reported within this assessment’s scope. This is not a security approval.

Assessment of code only; application behavior has not been executed or verified by this comment.

---

## 4. Incomplete: unsupported source

<!-- accessdiff-review-v1 -->
## AccessDiff — who gains access?

**Status:** incomplete · **Mode:** fixture

Fixture mode accepts only the exact bundled invoice examples; arbitrary code has not been assessed.

**File:** fixtures&#47;invoices.ts
**Base:** incomplete-fixed-base → **Head:** incomplete-unknown-head

| Actor | Before | After | Reason |
| --- | --- | --- | --- |


No conclusion: the assessment did not complete.

Assessment of code only; application behavior has not been executed or verified by this comment.
