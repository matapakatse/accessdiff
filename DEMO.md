# AccessDiff fixture demonstration

This local demonstration uses hardcoded known examples. It does not call a model or publish a GitHub comment.

## 1. Ownership check removed

<!-- accessdiff-review-v1 -->
## AccessDiff — who gains access?

**Status:** complete · **Mode:** fixture

Hardcoded demonstration of the bundled fixtures&#46; No model ran and no application requests were executed&#46;

**File:** invoice&#45;route&#46;js
**Base:** demo&#45;base → **Head:** demo&#45;head

| Actor | Before | After | Reason |
| --- | --- | --- | --- |
| owner | allowed | allowed | Assumes a valid authenticated owner and an existing invoice&#46; |
| other&#95;customer | denied | allowed | An authenticated customer who knows another existing invoice ID reaches the return when ownership is not checked&#46; |
| anonymous | denied | denied | Both bundled routes return 401 before querying when req&#46;user is absent&#46; |

### Another authenticated customer can read the invoice

For this example&#44; knowing an existing invoice ID permits access to another customer&#8217;s invoice&#46;

**Suggested correction:** Before returning the invoice&#44; deny access when invoice&#46;customerId differs from req&#46;user&#46;id&#46;

**Evidence:**

- head line 2: if &#40;&#33;req&#46;user&#41; return &#123; status&#58; 401 &#125;&#59;
- head line 3: const invoice &#61; await db&#46;invoice&#46;findUnique&#40;&#123; where&#58; &#123; id&#58; req&#46;params&#46;id &#125; &#125;&#41;&#59;
- head line 5: return &#123; status&#58; 200&#44; body&#58; invoice &#125;&#59;

Assessment of code only; application behavior has not been executed or verified by this comment.

---

## 2. Ownership check restored

<!-- accessdiff-review-v1 -->
## AccessDiff — who gains access?

**Status:** complete · **Mode:** fixture

Hardcoded demonstration of the bundled fixtures&#46; No model ran and no application requests were executed&#46;

**File:** invoice&#45;route&#46;js
**Base:** demo&#45;base → **Head:** demo&#45;head

| Actor | Before | After | Reason |
| --- | --- | --- | --- |
| owner | allowed | allowed | Assumes a valid authenticated owner and an existing invoice&#46; |
| other&#95;customer | allowed | denied | An authenticated customer who knows another existing invoice ID reaches the return when ownership is not checked&#46; |
| anonymous | denied | denied | Both bundled routes return 401 before querying when req&#46;user is absent&#46; |

No ownership finding reported within this assessment’s scope. This is not a security approval.

Assessment of code only; application behavior has not been executed or verified by this comment.

---

## 3. Safe unchanged example

<!-- accessdiff-review-v1 -->
## AccessDiff — who gains access?

**Status:** complete · **Mode:** fixture

Hardcoded demonstration of the bundled fixtures&#46; No model ran and no application requests were executed&#46;

**File:** invoice&#45;route&#46;js
**Base:** demo&#45;base → **Head:** demo&#45;head

| Actor | Before | After | Reason |
| --- | --- | --- | --- |
| owner | allowed | allowed | Assumes a valid authenticated owner and an existing invoice&#46; |
| other&#95;customer | denied | denied | An authenticated customer who knows another existing invoice ID reaches the return when ownership is not checked&#46; |
| anonymous | denied | denied | Both bundled routes return 401 before querying when req&#46;user is absent&#46; |

No ownership finding reported within this assessment’s scope. This is not a security approval.

Assessment of code only; application behavior has not been executed or verified by this comment.
