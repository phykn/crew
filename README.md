<div align="center">

# AI Crew

비서 한 명에게 맡기고, Claude 에이전트 팀이 일하는 모습을 픽셀 캠프에서 지켜보는 데스크톱 앱

![Electron](https://img.shields.io/badge/Electron-45-47848F) ![React](https://img.shields.io/badge/React-19-61DAFB) ![Claude Agent SDK](https://img.shields.io/badge/Claude_Agent_SDK-0.3-D97757) ![SQLite](https://img.shields.io/badge/node:sqlite-builtin-003B57)

</div>

- 로컬 폴더를 프로젝트로 열고 세션별로 비서와 대화합니다
- 프로젝트와 세션은 앱을 다시 켜도 남습니다

## 설치

[Claude Code](https://docs.claude.com/en/docs/claude-code/overview)에 로그인되어 있어야 하고, Node.js 24 이상이 필요합니다.

```bat
npm install
```

## 실행

```bat
npm start
```

## 테스트

앱을 패키징한 뒤 Electron 화면 테스트를 실행합니다.

```bat
npm run test:e2e
```

## 참고

1. phykn, AI Crew 제품 구상, 2026. https://github.com/phykn/ai-crew
2. Anthropic, Claude Agent SDK, 2026. https://docs.claude.com/en/docs/claude-code/sdk
3. Electron Forge, Vite Plugin, 2026. https://www.electronforge.io/config/plugins/vite
