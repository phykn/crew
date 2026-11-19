---
name: style
description: Judge whether one change fits the project: structure, names, comments, leftovers, standard library first.
---

# Style

## Read the standard

An earlier source wins wherever they disagree:

1. The project's `CLAUDE.md` or `AGENTS.md`, and README.
2. The conventions the project's code already follows: how files and folders are split, how functions and files are named, how comments are written.
3. Standard library first: prefer the language's standard library and what the project already depends on, and flag a new dependency the standard library could replace.

## Check

1. Read the change in the files the coder lists: `git diff -- <files>`, or the files themselves outside git. Other uncommitted changes are the user's own.
2. Check structure (each file has one clear role and the change sits where it belongs), names (in the project's own style), comments (only a why the code cannot show; no restating, commented-out code, or TODOs), leftovers (unused or duplicated code), and dependencies.
3. Every point names its source, which file and which rule, and the exact fix. Skip anything the sources do not support.
