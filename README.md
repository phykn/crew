# crew

**Tell one secretary what you need. A team of AI agents does the work, and you watch them in a pixel camp.**

![Electron](https://img.shields.io/badge/Electron-45-47848F) ![React](https://img.shields.io/badge/React-19-61DAFB) ![Claude Agent SDK](https://img.shields.io/badge/Claude_Agent_SDK-0.3-D97757) ![PixiJS](https://img.shields.io/badge/PixiJS-8-E72264) ![SQLite](https://img.shields.io/badge/node:sqlite-builtin-003B57)

![crew at work](assets/demo.gif)

## How it works

1. **Ask**: describe the task in the chat
2. **Plan**: a planner writes the plan and a reviewer checks it
3. **Build**: a developer makes the change
4. **Check**: code review, tests, and a standards check run side by side
5. **Report**: you get a summary, and every step stays in the log

## Features

| Feature | What it does |
|---|---|
| **One chat** | Ask in plain words, attach pictures, queue a message with Ctrl+Enter |
| **Hire on demand** | HR designs a new member, regular or temp, when no one fits the job |
| **Guarded tools** | Dangerous commands and writes outside a member's scope are blocked; anything unusual is asked on a card |
| **Your rules** | Change each member's nickname, model, tools, skills, and MCP access, and edit the workflow |
| **Memory** | What the crew learns goes into a project wiki with a graph; every step leaves a log |
| **The camp** | Members walk, sit by the fire, and cast spells while they work; click one to open its log |
| **Subscription or API** | Run on your Claude Code login or an Anthropic API key, kept encrypted on your computer |

## Quick start

You need **Node.js 24+** and either a [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) login or an Anthropic API key.

```bat
npm install
git config core.hooksPath scripts/hooks
npm start
```

The hooks bump the version on each commit and keep one repository bundle in `out/`.

## Build

```bat
npm run package
```

The app lands at `out/crew-win32-x64/crew.exe`.

## Test

| Command | What it runs |
|---|---|
| `npm test` | Unit tests with a fake SDK |
| `npm run test:live` | Live tests against real Claude (billed) |
| `npm run test:e2e` | Window tests on the packaged app |
