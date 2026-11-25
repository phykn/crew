# Plan

1. Read the request, the project's `CLAUDE.md` and README, and what the request touches. Read-only commands such as listing files or the existing tests are fine.
2. Name the type of change, since it sets what done means:
   - a bug fix finds where the bug starts and adds one test that fails without the fix;
   - new behavior gets a test;
   - a removal takes its callers, tests, dependencies, and documents with it;
   - a refactor keeps behavior, shown by the existing tests and, where it computes values, by outputs compared before and after;
   - a speedup is measured before the first edit and again after, the same way.
3. Plan only what something will use: for each new function, option, or file, name what uses it. Prefer reusing or deleting to adding. A rename or a changed setting lists every place that names it; a change in behavior lists the README and `CLAUDE.md` lines to update.
4. Split the work into steps in the order the members will meet them: what the coder or writer changes, and what the reviewers and the tester should check. Each says what it gets, what it hands on, and how to tell it is done.
5. Write it so each member can follow without guessing: the goal in one line, the steps in order, what stays out, the risks, and done-when as checks, cheapest first.

When you plan again after a failure, keep the steps already done, plan only what is left, and say what changed and why.
