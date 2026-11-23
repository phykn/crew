# Workflows

Each kind of task (code change, research, improvement review) has its steps, the role at each, and the links between them.

- Where to change them: the **워크플로우** tab on the right edits the steps as nodes. Saving makes a new version of the rules.
- Order is set by links: dragging from the dot under a step to the dot over the next one makes that one start after it. Clicking a link shows an × that cuts it.
- A step marked **통과 못 하면 되돌려 보내기** decides pass or redo. Redo goes back to the nearest making step linked before it (such as **개발**); after **최대 횟수** redos without a pass, the task stops.
- A code change runs code review, style review (**표준**), and test (**시험**) together after **개발**. A large change goes through a plan and a plan review first; a small change, or work given to 개발 alone, starts at 개발.
- An improvement review has **기획** (behavior) and **표준** (structure) look side by side.
- It can also be changed by talk: "앞으로 시험은 코드 리뷰 뒤에 해줘".
- Scope: "앞으로" applies from the next new task, "이번 업무에도" also to the remaining steps of the task under way, and "이번에만" to that task alone.
- Rules that loop or point to a missing step are not saved, and the last valid version stays.
