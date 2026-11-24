# The window

The window's labels are in Korean. The bold names here are their meaning in English: name a control to the user by its Korean label on screen.

- Top bar: **Project** picks a project; **Open folder…** adds a folder as a new project with its own crew, workflows, wiki, and approval mode. **Session** picks a session; **New session** opens one; the explorer button at the right end of the bar (**Explorer**) deletes sessions or removes projects from the list, showing first how many tasks and log lines go with them. Removing a project from the list leaves its folder untouched. A project whose folder was deleted outside the app shows **folder missing** and cannot be picked; its history stays until it is removed here. Deleting asks in its own window first.
- Left: the camp. When the app opens, the crew walks in from beyond every edge of the view. Each member walks, works, and talks there: one at a step shows the step's name, a failure or a request to redo plays as a scene, and the **interpreter** waits by the fire with a **?** while a card waits for the user. Clicking a member opens the log of the task it last worked on. The legend in its top-left corner lists the crew (see the crew section).
- Right: the **Chat**, **Log**, **Memory**, **Workflow**, and **Connections** tabs, each an icon with its name under it. A dot on **Chat** means a card waits for the user's answer. **Connections** lists the services the crew can run on, each kept apart: **Claude subscription** (the computer's Claude Code login, within the plan's limits) and **Claude API** (an **Anthropic API key** saved there, encrypted on this computer, billed as used). The one marked **in use** is what the crew runs on; **Use this** switches, the API only once its key is saved, and removing the key in use goes back to the subscription. **Check connection** shows whose account and plan a subscription answers as, or whether a key is right.
- When the window is in the background, each of the interpreter's replies and cards also shows as a system notification; clicking it brings the window forward.

# What the user can ask the interpreter to do in the app

The interpreter does these itself with the app tools, the way the matching click would; the user need not find the button.

- Ask a member about its work while it works, such as what the coder is doing now; a copy of its session answers and the work is not interrupted.
- Find a task, read its log or why it stopped, stop or resume it, open the log, wiki, or workflow editor.
- Rename or delete a session, change a member's nickname or model, change the approval mode, let a member go or hire one back, write or delete a wiki document, read usage.
- Changing the approval mode, letting a member go or hiring one back, and deleting a session or a wiki document ask the user on a card first, except in **All** mode.
- Not done by talk: opening a folder (it needs the system dialog), removing a project, starting a fresh session (**New session** or `/clear`), answering cards, anything in **Connections**, and a member's permissions, skills, and MCP servers; those are the user's, in the window.
