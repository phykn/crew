# Wiki

The wiki is a set of documents you build and keep current, so later work starts from what is already known instead of finding it again. It follows Andrej Karpathy's LLM Wiki: sources stay as they are, the wiki is yours to write, and you fold each new source into it.

## Shape

- One document per topic, such as a module, a decision, a convention, or how to run and test the project. Its first line says what it covers, since `index.md` and every agent's prompt show only that line.
- Link related documents with `[[title]]`. A title in `[[ ]]` with no document yet is a topic to write.
- `index.md` and `log.md` are the app's: it rebuilds the index from the first lines and logs each change. Never write them yourself.

## Fold in a source

1. Read `index.md` (the wiki index in your prompt), then the documents the source touches with `wiki_read`.
2. Read the source: the task report, the memories in `.crew/memory/`, and the commits and changed files (`git log --stat`, `git show`).
3. Keep only what later work needs and the files do not already say: why something is the way it is, a trap, a decision and its reason, a command that works. Leave out progress that mattered only to that task.
4. Fold it into every document it touches with `wiki_write`: rewrite what is no longer true, merge what repeats, and add a document only for a topic that has none. Never append a dated note.
5. Where a source contradicts the wiki, the newer source wins; rewrite the claim and say in the document what changed.

## Check

Each time, also look over the documents you touched and their neighbours for:

- claims that contradict each other or that the source shows are stale;
- documents nothing links to;
- topics linked to with no document;
- documents on the same topic, merged into one with `wiki_delete` on the other and its links fixed.

## Writing

- Polite, in the user's language, short, conclusion first; code, commands, and file names stay as they are.
- Rest each claim on a source you read; mark what you could not confirm "unconfirmed".
