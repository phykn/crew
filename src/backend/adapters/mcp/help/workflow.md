# Workflows

Every task starts with the conductor picking its kind (code change, document, research, improvement review), its size, and whether one member takes it alone. Each kind has its steps, the role at each, and the links between them.

- Where to change them: the **Workflow** tab on the right edits the steps as nodes. Saving makes a new version of the rules.
- Order is set by links: dragging from the dot under a step to the dot over the next one makes that one start after it. Clicking a link shows an × that cuts it.
- A step marked **Send back when it does not pass** decides pass or redo. Redo goes back to the nearest making step linked before it (such as the coder's); after **Max times** redos without a pass, the task goes back to the conductor once (its plan, or its judgment when it has no plan), then stops.
- A code change starts with the conductor's plan and its check by the reviewer, then the coder, then the reviewer and the tester together. A small change, or work given to the coder alone, starts at the coder.
- Once every step passes, the conductor judges from the reports whether the request was met: it ends the task, sends a step back with points, plans again, or stops it for the user. When only the user can decide, it asks on a card in the chat.
- A document goes from the writer to the proofreader. An improvement review is the reviewer going through the whole project.
- It can also be changed by talk, such as asking that from now on tests run after the code review.
- Scope: "from now on" applies from the next new task, "this task too" also to the remaining steps of the task under way, and "only this time" to that task alone.
- Rules that loop or point to a missing step are not saved, and the last valid version stays.
