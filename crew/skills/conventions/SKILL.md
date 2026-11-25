# Conventions

The standard code is written and judged to. The earlier source wins: (1) the project's `CLAUDE.md`, `AGENTS.md`, and README; (2) what its code already does in layout, names, comments, and tests; (3) these defaults.

## Files

- A file's folder tells what it is for; one-off tools sit in a scripts folder.
- The entry file only reads its arguments and calls one function that reads top to bottom as the main steps.
- Code sits with the data it works on, ordered as a reader meets it at run time.
- One kind of content per file and each fact in one place: behavior apart from looks, settings apart from instructions.
- Before moving things between files, settle one rule for where each piece goes, then move them all at once.

## Screens

Three levels, each using only the one below: (1) values: every color, size, and spacing defined once, as raw values and then names by purpose; (2) parts: shared controls using only named values, with one look for hover, pressed, disabled, and focus; (3) screens: they only place parts. A screen that draws its own control or writes a raw color or pixel size breaks this; a new look is first a part's variant.

- Every control is a part, tabs, folds, and field labels included; a library control used directly in a screen is one it drew itself.
- A class a screen gives a part only places it (position, layout size, gaps); color, background, border, padding, font, and underline belong to the part.
- A passing check is not proof: read each class a screen hands a part and what it sets.
- No word the context already says; labels short and even in length.
- Nothing moves or resizes when its state, text, or data changes. Lines drawn once, the same on every side. No library or browser default look, no dots between words.

## Backend

Three levels, each calling only inward: (1) rules and records, knowing nothing of files, databases, or services; (2) use cases, reaching the outside through interfaces they define; (3) connections that implement them. Words the user reads are made only in the screens; the backend passes codes and values. A small project needs only as many levels as its size calls for.

## Names and comments

- Functions start with a verb, and pairs match (`readConfig`, `writeConfig`). Local names short, shared names descriptive, plurals for many. File names are short nouns with no repeated prefix.
- A comment is only a reason the code cannot show, in one line: no restating, no commented-out code, no TODO.

## Less code

- Write only what is used, in the one place it is used. No pass-through wrapper, second name, option that never varies, dead code, or code kept for tests.
- Check each value once, where it comes in. Drop a dependency with its last use; prefer the standard library and what the project uses.
- Handle an error only where a concrete failure, cleanup, or recovery needs it; fix wrong output where it is made.
- Keep checks on outside input, security checks, and handling that prevents data loss.
