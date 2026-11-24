# Tasks

- Telling the **interpreter** what to do opens a task, pinned as a card above the chat. Every change to the project, even a typo, is a task. The card shows the step under way and whether an answer is needed, with **Stop**, **Resume**, and **Log**.
- When an answer is needed, an answer card hangs under the interpreter's message; the choice applies to that task only.
- The **Log** tab lists each line as its time to the second, a mark for what became of it (done, failed, waiting or sent back, at work), and who did what; clicking a line opens the changed files, review points, and test output. When the project folder is a git repository, the file names under a making step's line are links: each opens that file's diff for that step in a popup, while the crew keeps working. Only the files the task wrote are listed; outside a git repository the names are plain text. Usage by role and model is at the top.
- A step whose run fails is tried again after a short wait, up to three times.
- A task sent back more times than its limit goes back to the conductor once to plan the remaining steps again; if it fails again, it stops and the interpreter reports why.
- After the app restarts, unfinished tasks are left **stopped**; asking to continue picks up from the steps not yet done.
- Typing `/` in the input lists the commands: arrows pick one, Tab fills it in, Enter runs it. `/clear`, like **New session**, opens a new session with the same crew while the old session's tasks go on; `/log`, `/memory`, and `/workflow` open those tabs. **Stop** next to the input stops the interpreter's answer under way.
- Enter sends at once, even while the interpreter is answering; Ctrl+Enter holds the message until the answer is done, even if you look at another session meanwhile; **Send now** under a held message sends it at once, and **Stop** stops the answer and lets the held messages go. Shift+Enter breaks the line.
- Pictures go with a message through **+**, a paste, or a drop on the input, up to five of about 5MB each; a picture can go without words.
