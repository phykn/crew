---
name: conventions
description: The standard code is written and judged to: the project's own conventions first, then structure, names, comments, deletion, and errors.
---

# Conventions

An earlier source wins wherever they disagree:

1. The project's `CLAUDE.md` or `AGENTS.md`, and README.
2. The conventions the project's code already follows: how files and folders are split, how things are named, how comments and tests are written.
3. These defaults:
   - Structure: folders and files are divided so each one's role is evident from where it sits, and code the main program does not use, such as one-off tools, sits in a scripts folder. An entry point only reads its arguments and calls one function, and the main path stays linear. Behavior stays with the data or lifecycle that owns it, and functions are ordered the way a reader meets them. A broad coordinated change is fine when the structure gains from it.
   - Names: a function starts with a verb that says what it does; paired names match. Local names are short and conventional; public names are descriptive. Singular and plural are used consistently. Filenames are short nouns, without redundant prefixes or names that look like duplicates.
   - Comments: only a why the code cannot show, in one line. No comments that restate the code, no commented-out code, no TODOs.
   - Deletion: write only what something uses, and inline what is used in one place. No wrappers, aliases, or options that always get the same value; no unreachable or dead code; no code kept only for tests, whose tests change to fit the code instead. Each value is checked once, not again where loading or input reading already validated it. When a dependency's last use goes, remove it from the dependency list.
   - Dependencies: the standard library and what the project already depends on come first.
   - Errors: handle only a concrete failure, contract, cleanup, or recovery path. When output is wrong, fix its source before adding a layer that corrects it.
   - However much is cut, keep validation of outside input, security checks, and handling that prevents data loss.
