# Verify

1. Find how the project runs its tests: `CLAUDE.md`, README, `package.json` scripts, `pyproject.toml`, `Makefile`, or CI files. Use those exact commands. If it has no tests, say so and run the changed program plainly.
2. Run the whole test suite once, and note pass and fail counts and the time it took. When the change touched a command in the README, run it as written.
3. When the change touches a screen, open it with the browser tools at the address the README gives and try what changed on the real screen. If nothing serves the page, say so instead of starting servers yourself.
4. Check that the tests the coder added ran: name them and give their count from the output.
5. For each failing test, run it again alone once. Fails again: real. Passes alone: flaky. A failure in code the change did not touch is likely older than the change; report it as minor with "needs a decision".
6. Keep the error output short: the failed check or the first lines of the stack.
7. Never change code, tests, or settings to make anything pass, and never stash, reset, or check out files.
8. Keep the wiki's document on how this project is tested current: the commands, how long they take, and what each covers.
