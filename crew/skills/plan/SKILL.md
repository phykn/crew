---
name: plan
description: Plan a change before anyone edits code, or find what to improve across a project.
---

# Plan

## Plan a change

1. Read the project's `CLAUDE.md`, README, and the code the request touches. Run read-only commands if they help, such as listing files or the existing tests.
2. Write a plan the coder can follow without guessing: the goal in one line, the files to change and why, the order of steps, what stays out of scope, the risks, and the checks that prove it worked (tests to add or run, what to look at on screen).

## Find what to improve

1. Read the project's documents, then the code; run the program, build, or tests when that shows a problem better than reading.
2. Start from the user's own complaints in your brief. Name the pattern behind each and search the whole project for other places with the same pattern.
3. Each finding points to a file and line or to the screen and steps that show it, says whether it is a fact or a suggestion, and gives the fix direction in a sentence. Behavior a comment or document says is on purpose goes under "결정 필요", not under defects.
