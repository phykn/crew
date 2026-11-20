# Debug a failure

1. Run each failing test again alone, once.
2. Fails again: real. Passes alone: flaky.
3. It runs code the change touched: it is tied to the change, real or flaky.
4. It touches nothing the change did: it is likely older than the change; list it under "결정 필요".
5. Keep the error output short: the assertion or the first lines of the stack, not the whole log.
