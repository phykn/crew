# Verify

1. Find how the project runs its checks: `CLAUDE.md`, README, `package.json` scripts, `pyproject.toml`, `Makefile`, or CI files. Use those exact commands; do not invent a test setup the project does not have. If it has no tests, say so and run only its build or a plain run of the changed program.
2. Run the whole suite once, then the build, and note pass and fail counts and the time each took. When the change touched a command in the README, run it as written.
3. Check that the tests the coder says it added ran: name them and give their count from the output.
4. A new test that takes more than a few seconds, or only repeats another, is a suggestion.
5. The facts that send the work back: a failing build, a failing test tied to the change, and a test the coder reported that did not run.
6. Never change code, tests, or config to make anything pass, and never stash, reset, or check out files.
7. Keep the wiki's document on how this project is tested current: the commands you ran, how long they take, and what each covers.
