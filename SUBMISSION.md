# AccessDiff

## Project description

AccessDiff is a security agent that lives inside GitHub pull requests and answers one focused question: **who gains access because of this change?** When a pull request modifies an authorization-sensitive route, AccessDiff compares the original and proposed code for the rightful owner, another authenticated customer, and an anonymous visitor. It posts a clear before-and-after access table, links every conclusion to exact source lines, explains the business impact, and suggests a correction where developers already decide whether code should ship.

The working prototype uses GitHub Actions for the pull-request workflow and OpenRouter for model reasoning. AccessDiff validates the model response before publishing it and fails safely when evidence is missing. After AccessDiff confirms a finding, Exa Agent adds current remediation guidance grounded in authoritative OWASP sources. Ambiguous records the finding as a follow-up task so remediation is tracked rather than forgotten. The included executable demo proves the ownership failure against controlled invoice routes, and all 29 automated tests pass.

## Links

- Repository: https://github.com/matapakatse/accessdiff
- Live pull-request review: https://github.com/matapakatse/accessdiff/pull/1#issuecomment-5645733810
- Demo video: `demo/AccessDiff-Demo.mp4`

## Social post

We built **AccessDiff**, a security agent that lives inside GitHub pull requests and asks: *who gains access because of this change?*

It detects authorization changes, cites exact code evidence, explains the impact in plain language, uses Exa Agent for OWASP-grounded remediation guidance, and tracks follow-up work through Ambiguous—all before the code is merged.

Built at AI Tinkerers Johannesburg. #AITinkerers #AIAgents #Cybersecurity #BuildInPublic

Add the official event-partner tags required by the submission portal before posting.
