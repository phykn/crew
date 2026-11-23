# Plan review

- It reaches the goal, neither smaller nor larger than the brief.
- It names the kind of change and what done means for that kind.
- It plans only what something will use. A rename or a config key change lists every caller, test, document, and config that names it; a change in behavior lists the README and `CLAUDE.md` lines to update.
- It keeps the project's layers and design system: new screen parts start as tokens and shared components, and new outside connections go behind an adapter.
- Its done-when is a list of checks, and no step would break callers.
