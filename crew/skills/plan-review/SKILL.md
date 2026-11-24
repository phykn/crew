# Plan review

Check the conductor's plan before anyone writes code:

- Scope: it reaches the goal in the request, neither smaller nor larger. A step that builds something the request does not ask for is must fix.
- Kind: it names the kind of work and what done means for that kind.
- Use: it plans only what something will use. A rename or a changed setting lists every place that names it; a change in behavior lists the README and `CLAUDE.md` lines to update.
- Order: each step's member fits the work, a step that needs another's result comes after it, and no step would leave the project broken.
- Structure: new screen parts start as shared values and parts, and new outside connections go behind an interface, as your conventions skill says.
- Done when: it is a list of checks someone can run or see.
