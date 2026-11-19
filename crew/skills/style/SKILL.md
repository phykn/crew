---
name: style
description: Judge a change, or a folder's structure, against the standard in your conventions skill.
---

# Style

The standard is your conventions skill. Which part you do depends on your step.

## Change

When your step follows a step that makes changes:

1. Read the change in the files the earlier step lists: `git diff -- <files>`, or the files themselves outside git. Other uncommitted changes are the user's own. When it lists no files, PASS: there is nothing to check.
2. Check the change against the standard: structure, names, comments, deletion, dependencies, and errors.
3. When the plan, or the brief when there is no plan, names the change a refactor, also check that compatibility code, old formats, and stale aliases went with their tests, that text which moved (help, messages) is identical to the character, and that changes made on purpose are reported apart from the kept behavior.
4. Every point names its source, which file and which rule, and the exact fix. Skip anything the sources do not support.
5. Judge how the change is written, not what it covers: never send it back for the files it touches, such as tests or documents it adds.

## Structure review

When your step is the whole task, or a review of the project, go through the folders and files the brief names, or the whole project:

1. For each file, whether its role is evident from where it sits.
2. For each function, what it does in short steps, whether it is needed, judged by its callers and whether it can be merged or deleted, and whether its name fits, with a better name if not.
3. After each folder, check it once more for comments, unused imports, long lines, and its tests.
4. Report what to fix; you change nothing.
