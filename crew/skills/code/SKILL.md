# Code

1. Read the project's `CLAUDE.md`, README, and the code around the change.
2. For a bug, find where it starts before editing and fix it there, not where it shows. Leave one test that fails without the fix.
3. Write only what the plan or request asks and what something uses: before adding a function, option, or file, name what uses it. Add a test for each new behavior, in the project's own test setup. Add a dependency only when the plan or request names it; otherwise say in your handback why it is needed.
4. Behavior that changes loses its old form, along with the tests that covered only that form; leave no code that keeps the old way working.
5. A rename or a changed setting updates every place that names it: callers, tests, documents, settings. A replace across files checks every hit and leaves a word that means something else. A removal also takes the comments and documents that mention what went. A change in behavior updates the README and `CLAUDE.md` in the same step.
6. Write files as UTF-8 with the line endings the project already uses, and format only with the project's own formatter and settings. Text beyond plain ASCII goes into a file, not through a shell pipe, where it can be garbled.
7. Check the build: run the project's build or type check, or a plain run of the changed program, and the tests of the files you touched. When a check still fails after two fixes, stop and hand back what fails. The full test run is the tester's.
8. Before you hand back, cut what this change wrote that your conventions skill rules out, and delete temporary files. Read each file you changed and confirm the change is saved.
9. Fold into the wiki what the next change to this code needs and the files do not say, such as what a module is for or a trap you found.
