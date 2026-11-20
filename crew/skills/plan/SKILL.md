# Plan

## Plan a change

1. Read the project's `CLAUDE.md`, README, and the code the request touches. Run read-only commands if they help, such as listing files or the existing tests.
2. Name the kind of change; it sets what done means:
   - a bug fix finds the cause where it arises and adds one regression test the unfixed code fails;
   - new behavior gets a test;
   - a removal takes its callers, tests, dependencies, and documents with it;
   - a refactor keeps behavior, shown by the existing tests;
   - a speedup is measured before the first edit and again after, the same way.
3. Plan only what something will use: name what calls each new function, option, or file, and prefer reusing or deleting code to adding it. A rename or a config key change lists every caller, test, document, and config that names it; a change in behavior lists the README and `CLAUDE.md` lines to update.
4. Write it so the coder can follow without guessing: the goal in one line, the files to change and why, the order of steps, what stays out, the risks, and done-when as checks, cheapest first (tests to add or run, what to look at on screen).

## Find what to improve

1. Read the project's documents, then the code; run the program, build, or tests when that shows a problem better than reading.
2. Start from the user's own complaints in your brief. Name the pattern behind each and search the whole project for other places with the same pattern.
3. Each finding points to a file and line or to the screen and steps that show it, says whether it is a fact or a suggestion, and gives the fix direction in a sentence. Behavior a comment or document says is on purpose goes under "결정 필요", not under defects.
