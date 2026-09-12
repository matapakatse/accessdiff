# AccessDiff: team directions

## What it does

A pull request changes the fictional invoice route. AccessDiff compares owner, other-customer and anonymous access, cites exact code lines, and updates one GitHub comment. It can create/update a remediation task in Ambiguous. Assessments are static: the bot does not execute PR code or approve merges.

## Where to look

- Repository: https://github.com/matapakatse/accessdiff
- Demo PR: https://github.com/matapakatse/accessdiff/pull/1
- Workflow runs: https://github.com/matapakatse/accessdiff/actions
- Ambiguous: open your workspace's Tasks page; search for `AccessDiff`.

## Configuration (already being configured for this team)

GitHub repository Settings → Secrets and variables → Actions:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | OPENROUTER_API_KEY | Your private OpenRouter key |
| Variable | MODEL_NAME | nvidia/nemotron-3-super-120b-a12b:free |
| Secret, optional | AMBIGUOUS_API_KEY | Your Ambiguous key with task read/write access |
| Variable, optional | AMBIGUOUS_WORKSPACE_ID | Expected workspace ID; rejects a mismatched workspace |

Never commit keys. Free providers have rate/availability limits. An Ambiguous error does not invalidate or hide the GitHub assessment; inspect the review step's log.

## Run locally

```sh
git clone https://github.com/matapakatse/accessdiff.git
cd accessdiff
npm ci --ignore-scripts
npm run typecheck
npm test
npm run demo
npm run demo:live
```

Node 22 is required. `npm run demo:live` executes the three identities against the bundled synthetic routes and needs no model key. `npm run demo` renders the prepared review comments. Tests and local demos execute only bundled synthetic fixtures, never fetched PR code.

## Reproduce the real demo

Use a new branch from the latest main. Change the existing `fixtures/invoices.ts` file, commit, push, and open a PR. Keep the workflow and reviewer on trusted main.

1. Copy `fixtures/invoice-vulnerable.txt` into `fixtures/invoices.ts`: other customer should gain access; owner stays allowed and anonymous denied.
2. After the review finishes, copy `fixtures/invoice-fixed.txt` into that same route and push: the same PR comment should show denied other-customer access and no finding. If the branch would become identical to main, add a harmless comment to retain a changed file.
3. Copy `fixtures/invoice-helper.txt` into the route and push: the bot should recognize the called ownership helper and avoid a false alert.
4. In Ambiguous, a previously created task is updated with the new assessment. A person confirms closure; the bot does not automatically mark it done.

Wait for each run before pushing the next scenario. Do not merge the intentionally vulnerable demo branch. Repeated concurrent writers can still race despite the pre-write head check.

## Recording

Show the PR change, the actual model report with code evidence, the correction result, and the secure-helper result. Show the Ambiguous task only if saved/read-back has been verified. Label edited-out waiting time. Do not substitute the fixture renderer for a live model result.

## Team coordination

Pull the latest main before edits. Keep commits small and coordinate ownership before changing model, workflow or result contract. No force-push. This prototype handles one existing modified file, not arbitrary repository-wide security review.
