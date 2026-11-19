---
name: debug
description: Read a failure, rerun it alone, and say whether it is real, flaky, or older than the change.
---

# Debug a failure

1. Run each failing test again alone, once.
2. Fails again: real. Passes alone: flaky; say so, it still fails the round.
3. Touches nothing the change did: possibly older than the change; it still fails the round.
4. Keep the error output short: the assertion or the first lines of the stack, not the whole log.
