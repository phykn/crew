---
name: style
description: Judge whether one change fits the standard in your conventions skill.
---

# Style

The standard is your conventions skill.

1. Read the change in the files the coder lists: `git diff -- <files>`, or the files themselves outside git. Other uncommitted changes are the user's own.
2. Check the change against the standard: structure, names, comments, deletion, dependencies, and errors.
3. Every point names its source, which file and which rule, and the exact fix. Skip anything the sources do not support.
