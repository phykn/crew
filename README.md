<div align="center">

<h1>crew</h1>

<p><b>One word to your secretary, and a team of AI agents gets it done while you watch them in a pixel camp.</b></p>

<img src="https://img.shields.io/badge/Electron-45-47848F" alt="Electron"> <img src="https://img.shields.io/badge/React-19-61DAFB" alt="React"> <img src="https://img.shields.io/badge/Claude_Agent_SDK-0.3-D97757" alt="Claude Agent SDK"> <img src="https://img.shields.io/badge/PixiJS-8-E72264" alt="PixiJS"> <img src="https://img.shields.io/badge/node:sqlite-builtin-003B57" alt="SQLite">

<br><br>

<img src="assets/demo.gif" alt="crew at work" width="720">

</div>

## Features

- **A crew behind one chat**: tell the secretary what you need; the crew plans, builds, reviews, tests, and reports back
- **Hire on demand**: HR designs a new member, regular or temp, when no one fits the job
- **Guarded tools**: dangerous commands and writes outside a member's scope are blocked, and anything unusual is asked on a card
- **Your team, your rules**: change each member's nickname, model, tools, skills, and MCP access, and edit the workflow they follow
- **Memory that stays**: what the crew learns goes into a project wiki with a graph, and every step leaves a log
- **A camp you can watch**: members walk, sit by the fire, and cast spells while they work; click one to open its log
- **Subscription or API**: run on your Claude Code login or on an Anthropic API key, kept encrypted on your computer

## Install

Requires Node.js 24+ and either a [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) login or an Anthropic API key.

```bat
npm install
git config core.hooksPath scripts/hooks
```

The hooks bump the version on each commit and keep one repository bundle in `out/`.

## Run

```bat
npm start
```

Build the executable at `out/crew-win32-x64/crew.exe`:

```bat
npm run package
```

## Test

Unit tests with a fake SDK, live tests against real Claude (billed), and window tests on the packaged app:

```bat
npm test
npm run test:live
npm run test:e2e
```
