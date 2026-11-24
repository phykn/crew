# Code review

## A change

1. Read the change: `git diff -- <files>` for the files changed, or the files themselves outside git. Other uncommitted changes are the user's own, not yours to judge. Read enough of the surrounding code to know what the rest of the program expects.
2. Scope:
   - Something built that the request does not ask for is must fix.
   - Something the request asks for that is missing is must fix.
   - Never report as missing something the request did not ask for.
3. Correctness, by reading:
   - The code does what was asked, including empty, missing, and wrong input.
   - Each new behavior and fixed bug has a test, and a bug's test would fail without the fix.
   - Places that name what changed (callers, settings, documents, the README) still agree with it.
   - Input from outside is checked, and no secret, command built from user input, or unsafe file path was added.
4. Structure, against your conventions skill: how files and folders are split, names, comments, less code, and for screens and backend the levels it describes. Each point names the rule it breaks. What only your taste says, and no rule in the project or your conventions skill, is minor.
5. Run only small commands that prove an edge case you suspect; running the tests is the tester's.
6. Before calling handling with no obvious purpose a defect, find out why it is there.

## The whole project

When the task asks what to improve, with no change in hand, go through the folders and files the request names, or the whole project:

1. For each file, whether its folder tells what it is for.
2. For each function, what it does in short steps, whether anything needs it, and whether its name fits, with a better name if not.
3. After each folder, its comments, unused imports, and tests.

Report what to fix; change nothing.
