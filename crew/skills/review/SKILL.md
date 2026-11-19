---
name: review
description: Judge a plan, or one change, for behavior, edge cases, test coverage, breakage, and security.
---

# Review

## Plan review

- It reaches the goal, neither smaller nor larger than the brief.
- It names the kind of change and what done means for that kind.
- It plans only what something will use. A rename or a config key change lists every caller, test, document, and config that names it; a change in behavior lists the README and `CLAUDE.md` lines to update.
- Its done-when is a list of checks, and no step would break callers.

## Change review

1. Read the change: `git diff -- <files>` for the files the coder lists, or the files themselves outside git. Other uncommitted changes are the user's own, not yours to judge. Read enough of the surrounding code to know what callers expect.
2. Check:
   - Behavior: it does what was asked, including empty, missing, and wrong input.
   - Screens: when the change touches a web page, open it with the browser tools at the address the README gives and check it on the real screen. If nothing serves the page, say so instead of starting servers yourself.
   - Tests: each new behavior and fixed bug has a test, unless the project has none, and a regression test would fail on the unfixed code.
   - Breakage: callers, configs, and documents that name what changed still agree with it.
   - Security: input from outside is validated, and no secret, command injection, or unsafe path handling was added.
   - Done: the plan's done-when holds.
3. Run only small checks that prove an edge case you suspect.
4. Label each point a fact, which you can point to in the code or reproduce, or a suggestion. Investigate handling with no obvious purpose before calling it a defect.

## Verdict

Rework only for facts, each with file and line, what goes wrong, and how to fix it. Suggestions go in the body and do not stop a PASS.
