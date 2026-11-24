# Conventions

The standard code is written and judged to. An earlier source wins wherever they disagree:

1. The project's `CLAUDE.md` or `AGENTS.md`, and README.
2. What the project's code already does: how files and folders are split, how things are named, how comments and tests are written.
3. These defaults.

## Files and functions

- A file's folder tells what it is for. Code the program does not use, such as a one-off tool, sits in a scripts folder.
- The file a program starts from only reads its arguments and calls one function, and that function reads top to bottom as the program's main steps.
- Code that works on some data sits with that data. Functions are ordered the way a reader meets them when the program runs.
- Each file holds one kind of content and each fact lives in one place: what a thing does apart from how it looks on screen, and settings apart from instructions. Files of one kind share one shape.
- Before moving things between files, settle by one rule where each piece goes, then move them all at once.

## Screens

Screens are built in three levels, each using only the one below it:

1. Values: every color, size, and spacing is defined once in one shared file, first as raw values and then as names by purpose, such as the background of a panel or the color of muted text.
2. Parts: shared controls such as buttons, inputs, and dialogs use only those named values, and each has one look for hover, pressed, disabled, and focus.
3. Screens: they place parts. A screen that draws its own control, or writes a raw color or pixel size, breaks this. A look no part has is first added to a part as a variant.

What the user sees follows the user's taste:

- Every word earns its place: no title, label, or explanation the context already says. A row's action is an icon with its name kept for screen readers. Labels are short words, and words side by side are of even length.
- Nothing jumps: no control moves or changes size when its state, text, or data changes.
- Lines are drawn once and look the same on every side; no seams, double borders, or solid offset shadows.
- Plain and tidy: no library's default look or browser-default control left showing, and no dots between words.

## Backend

Backend code is split by what it talks to, and each level calls only inward:

1. Rules and records: what the program decides and stores, with no knowledge of files, databases, networks, or other services.
2. Use cases: the steps of one thing the program does. When they need the outside, they call an interface they define themselves.
3. Connections: the code that actually talks to a database, files, HTTP, or another service, written to fit those interfaces.

A use case that calls a database or a service directly, or a rule that imports a connection, breaks this. A small project needs only as many levels as its size calls for.

## Names

- A function name starts with a verb that says what it does; paired names match, such as `readConfig` and `writeConfig`.
- Local names are short and usual; names others use are descriptive. Singular for one thing, plural for many.
- File names are short nouns, with no repeated prefix and nothing that looks like a copy of another file.

## Comments

- Only a reason the code cannot show, in one line. No comment that repeats the code, no commented-out code, no TODO.

## Less code

- Write only what something uses. Something used in one place is written in that place.
- No wrapper that only passes through, no second name for the same thing, no option that always gets the same value, no code that cannot run, and no code kept only for tests.
- Each value is checked once, where it comes in.
- When a dependency's last use goes, remove it from the dependency list. Prefer the standard library and what the project already uses.
- Handle an error only where a concrete failure, cleanup, or recovery needs it. When output is wrong, fix where it is made before adding code that corrects it.
- However much is cut, keep checks on input from outside, security checks, and handling that prevents data loss.
