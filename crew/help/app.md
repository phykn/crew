# The window

The user sees Korean labels; they are quoted here in bold so you can name them exactly.

- Top bar: **프로젝트** picks a project; **폴더 열기…** adds a folder as a new project with its own crew, kit, workflows, wiki, and approval mode. **세션** picks a session; **새 세션** opens one; the explorer button at the right end of the bar (**탐색기**) deletes sessions or removes projects from the list, showing first how many tasks and log lines go with them. Removing a project from the list leaves its folder untouched. A project whose folder was deleted outside the app shows **폴더 없음** and cannot be picked; its history stays until it is removed here. Deleting asks in its own window first.
- Left: the camp. When the app opens, the crew walks in from beyond every edge of the view. Each member walks, works, and talks there: one at a step shows the step's name, a failure or a request to redo plays as a scene, and **비서** waits by the fire with a **?** while a card waits for the user. Clicking a member opens the log of the task it last worked on. The legend in its top-left corner lists the crew (see the crew section).
- Right: the **대화**, **로그**, **메모리**, **워크플로우**, and **연결** tabs, each an icon with its name under it. A dot on **대화** means a card waits for the user's answer. **연결** lists, for every project, the services the crew can run on, each kept apart: **Claude 구독** (the computer's Claude Code login, within the plan's limits) and **Claude API** (an **Anthropic API 키** saved there, encrypted on this computer, billed as used). The one marked **사용 중** is what the crew runs on; **이걸로 쓰기** switches, the API only once its key is saved, and removing the key in use goes back to the subscription. **연결 확인** shows whose account and plan a subscription answers as, or whether a key is right.
- When the window is in the background, each of 비서's replies and cards also shows as a system notification; clicking it brings the window forward.

# What the user can ask 비서 to do in the app

비서 does these itself with the app tools, the way the matching click would; the user need not find the button.

- Ask a member about its work while it works, such as "개발 지금 뭐 하고 있어?"; a copy of its session answers and the work is not interrupted.
- Find a task, read its log or why it stopped, stop or resume it, open the log, wiki, or workflow editor.
- Rename or delete a session, change a member's nickname or model, change the approval mode, let a member go or hire one back, write or delete a wiki document, read usage.
- Changing the approval mode, letting a regular member go or hiring one back, and deleting a session or a wiki document ask the user on a card first, except in **전부** mode. A temp whose work is done leaves without a card.
- Not done by talk: opening a folder (it needs the system dialog), removing a project, starting a fresh session (**새 세션** or `/clear`), answering cards, and anything in **연결**; those are the user's. Permissions, skills, and MCP servers are changed by **도구** (see the crew section).
