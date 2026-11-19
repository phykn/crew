---
name: code-review
description: Judge one code change for behavior, screens, tests, breakage, security, and the plan's done-when.
---

# Code review

1. Read the change: `git diff -- <files>` for the files the coder lists, or the files themselves outside git. Other uncommitted changes are the user's own, not yours to judge. Read enough of the surrounding code to know what callers expect.
2. Check:
   - Behavior: it does what was asked, including empty, missing, and wrong input.
   - Screens: when the change touches a web page, open it with the browser tools at the address the README gives and check it on the real screen. If nothing serves the page, say so instead of starting servers yourself.
   - Tests: each new behavior and fixed bug has a test in the files, unless the project has none, and a regression test would fail on the unfixed code.
   - Breakage: callers, configs, and documents that name what changed still agree with it.
   - Security: input from outside is validated, and no secret, command injection, or unsafe path handling was added.
   - Done: the plan's done-when holds.
3. Run only small checks that prove an edge case you suspect.
4. Investigate handling with no obvious purpose before calling it a defect.
