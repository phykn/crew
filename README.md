<div align="center">

<h1>crew</h1>

<p>A desktop app where you hand work to one secretary and watch a team of AI agents do it in a pixel camp</p>

<img src="https://img.shields.io/badge/Electron-45-47848F" alt="Electron"> <img src="https://img.shields.io/badge/React-19-61DAFB" alt="React"> <img src="https://img.shields.io/badge/Claude_Agent_SDK-0.3-D97757" alt="Claude Agent SDK"> <img src="https://img.shields.io/badge/PixiJS-8-E72264" alt="PixiJS"> <img src="https://img.shields.io/badge/node:sqlite-builtin-003B57" alt="SQLite">

<br><br>

<img src="assets/demo.gif" alt="crew at work" width="720">

</div>

- Open a local folder as a project and talk to the secretary (비서). You can attach pictures, and a message sent with Ctrl+Enter waits until the secretary has finished answering. Ask for something and the secretary opens a task; the crew plans, reviews the plan, builds, then runs code review, tests, and a standards check, and the secretary reports back
- When no member fits the job, HR (인사) designs a new one, as a regular or a temp
- A guard checks every tool call, blocking dangerous commands and writes outside the allowed scope; a tool outside a member's role is asked on a card or let through, depending on the approval mode (ask, auto, or all)
- The legend changes each member's nickname, model, hiring, tools, write scope, skills, and MCP access, and a reset brings back the original settings
- The tabs on the right show the chat and task cards, the log and usage of each step, the project wiki and its graph, the workflow editor, and connections. In a git project, clicking a file name in the log shows what the task changed in a popup
- In the camp on the left, the crew walks in from beyond every edge when the app opens and moves around the campfire, with a spell circle and a status line under whoever is at work. Clicking a member opens that task's log
- The connection tab (연결) picks the service the crew runs on. Claude subscription (this computer's Claude Code login, within the plan's limits) and Claude API (a saved key, billed by use) connect separately, and a check shows which account answers. Keys are encrypted on this computer

## Install

Requires Node.js 24 or later. To run the crew, either log in to [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) or save an Anthropic API key in the app's connection tab.

```bat
npm install
git config core.hooksPath scripts/hooks
```

With the hooks on, each commit bumps the version by 0.0.1 and keeps a single repository bundle at `out/crew-<version>.bundle`.

## Run

```bat
npm start
```

To build the executable at `out/crew-win32-x64/crew.exe`:

```bat
npm run package
```

## Test

Unit tests with a fake SDK, integration tests that call real Claude (these cost money), and window tests on the packaged app.

```bat
npm test
npm run test:live
npm run test:e2e
```

## References

1. phykn, AI Crew product concept, 2026. https://github.com/phykn/ai-crew
2. Anthropic, Claude Agent SDK, 2026. https://docs.claude.com/en/docs/claude-code/sdk
3. Electron Forge, Vite Plugin, 2026. https://www.electronforge.io/config/plugins/vite
