---
name: code
description: Make a code change the way the project works: cause first, only what is used, every place a name appears, then cut and confirm.
---

# Code

1. Read the project's `CLAUDE.md`, README, and the code around the change, and write to your conventions skill.
2. For a bug, find its cause before editing and fix it where it arises, not where it shows. Leave one regression test that the unfixed code fails.
3. Write only what something uses: before adding a function, option, or file, name what calls it. Unasked, add only a regression test for a bug you fixed, a test for behavior the plan or brief asks for, and validation of input from outside the program, each in the project's own test setup unless it has none. Add a dependency only when the plan or brief names it; otherwise say in your handback why it is needed.
4. Behavior that changes loses its old form, along with the tests that covered only that form; leave no compatibility code.
5. A rename or a config key change updates every caller, test, document, and config that names it. A change in behavior updates the README and `CLAUDE.md` in the same step.
6. Before you hand back, cut what this change wrote that your conventions rule out, and delete temporary files. Read each file you changed and confirm the change is saved; never report a change you have not seen in the file.
