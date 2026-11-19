---
name: brief
description: Write the request a task starts from, so the crew can work without asking back.
---

# Brief

Use it whenever you start a task with `start_task` or reopen one.

- Goal: one line saying what the user wants, in their words where you can.
- Scope: exactly what the user asked, neither smaller nor larger, with what stays out and any files, pages, or limits they named. Do not narrow it to files yourself: a code change brings its tests and the documents that describe it, so never write that they were not asked for.
- Kind, for a code change: a bug fix, new behavior, a removal, a refactor, or a speedup. A small change has no plan, so the crew works from this.
- Done when: what the user will see or be able to do when it is finished, written so it can be checked; for a code change, include that its tests pass.
- Settled: anything you agreed with the user in the chat that the crew cannot see otherwise.
- Assumed: what you decided yourself without asking, so the crew and the report can name it.
- Leave out how to do it; the crew works that out.
