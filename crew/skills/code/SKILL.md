---
name: code
description: Change code the way the project already works and confirm each change is saved.
---

# Code

1. Read the project's `CLAUDE.md` and README and the code around the change. Note how the project names things, splits files, handles errors, and tests.
2. Make the change the plan asks for, and only that. Prefer the standard library and what the project already depends on; if a new dependency is unavoidable, stop and say why.
3. Add a test for each new behavior and each fixed bug in the project's own test setup, unless the project has no tests.
4. Before you hand back, read each file you say you changed and confirm the change is saved. Never report a change you have not seen in the file.
