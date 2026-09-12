# AccessDiff

A small GitHub pull-request review prototype asking **who could gain access because of this change?**

## Current build

- Local fixture demo: three actors, removed ownership check, restored check, explicit simulated output.
- OpenRouter adapter: one actual API call when configured, **owner access only**, runtime validation and exact source evidence checking.
- GitHub adapter: revision-specific API reads, bot-owned marker comment update and a head check immediately before publishing.
- No live API or GitHub run has been verified yet. Tests use mocks. This is not a production scanner or a security approval.

The supplied brief asked to label the owner as affected by a missing ownership check. That is incorrect: the other customer gains access, while the owner remains permitted. The fixture demonstrates the cross-customer issue. The owner-only model pass cannot find that issue, and does not pretend to. Extending the validated model output to other_customer is the next product milestone **after the live integration works**.

## Local start

Requires Node 22 and npm.

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
npm run demo
```

The demo uses only bundled exact-match fixtures, no API call and no credits. Unknown source inputs produce incomplete results. Fixture code is never executed by the reviewer.

## Live model check

Set OPENROUTER_API_KEY and MODEL_NAME in your shell using your normal secure credential process. No model is hardcoded. Confirm model availability and pricing in your OpenRouter account; limit the key's spend to the team's $5 cap. Do not put keys in a file tracked by Git.

```sh
npm run live -- fixtures/invoices.ts fixtures/invoice-vulnerable.txt
```

Use the actual fixture filenames present in fixtures/. The model checks owner access only, so removing an owner filter should not falsely flag an owner-access regression. Unsupported context gives incomplete; network/format failures give failed, never a fabricated finding. The adapter permits one call, 45 seconds, 4,096 output tokens and at most 80,000 bytes per input file. Token limits are not a dollar-budget guarantee.

## GitHub setup

1. Put this folder's contents at the root of the team's repository and commit to the default branch, including package-lock.json and the workflow.
2. Enable Actions, add repository secret OPENROUTER_API_KEY and repository variable MODEL_NAME.
3. Keep fixtures/invoices.ts as the reviewed route. Open a same-repository PR modifying that existing file.
4. The workflow runs trusted default-branch reviewer code and retrieves PR content through the GitHub API. Never change checkout to PR head under pull_request_target.
5. Push a correction; the existing GitHub Actions bot comment is updated.

The workflow's write permission must be permitted by organization/repository settings. External fork PRs, added/deleted/renamed target files, oversized PRs and binary files are unsupported. Scope is one configured file, not full-repository analysis. Base means the PR's current base SHA, not its merge-base; keep the demo base stable.

Concurrency cancellation and an immediate stale-head check reduce races. GitHub does not offer an atomic conditional issue-comment write: a head change between the last read and write remains possible. Every report displays the reviewed revisions; the next run updates the comment. Simultaneous independent first writers can still race, so use the supplied single concurrency group and avoid manual duplicate publishers.

Model input is source text only; no GitHub token or shell tools. Model fields and evidence are validated, and rendered text is escaped. The GitHub job does not install or execute PR code. Dependency install runs only trusted default-branch package-lock.json; workflow credentials are passed only to the review step.

## Two-minute demonstration

First show the clearly labeled local fixture report: owner permitted, other customer newly permitted, anonymous denied. Show the restored owner guard and reassessment. Then, once configured, show the real owner-only model report in GitHub and the same comment updating after a commit. State the narrower live scope explicitly; do not present fixture results as AI findings.

## Verification and handoff

Tier 1 is locally runnable. Tier 2 and Tier 3 have implementations and mocked tests, but cannot be called end-to-end verified until the team configures and runs their services. No Tier 4 investigation loop or multi-actor model analysis was added. No automatic fixes, merges, dashboard or voice interface.

Implementation references: [OpenRouter API](https://openrouter.ai/docs/api/reference/overview) and [GitHub workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request_target).
