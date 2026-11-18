<div align="center">

# AI Crew

비서 한 명에게 맡기고, Claude 에이전트 팀이 일하는 모습을 픽셀 캠프에서 지켜보는 데스크톱 앱

![Electron](https://img.shields.io/badge/Electron-45-47848F) ![React](https://img.shields.io/badge/React-19-61DAFB) ![Claude Agent SDK](https://img.shields.io/badge/Claude_Agent_SDK-0.3-D97757) ![SQLite](https://img.shields.io/badge/node:sqlite-builtin-003B57)

</div>

- 로컬 폴더를 프로젝트로 열고 세션별로 비서와 대화합니다
- 크루는 비서·인사·도구·기획·개발·리뷰·시험·표준·조사·그림 10명이고, 범례에서 별명·모델·고용 여부와 각자의 도구·쓰기 범위·스킬·MCP 접근(전체/읽기만)을 바꿉니다
- 비서는 프로젝트 파일을 읽고 바로 답하며, 답이 실시간으로 흘러나옵니다
- 가드가 모든 도구 호출을 검사해 push·재귀 삭제·전역 설치·허용 범위 밖 쓰기를 막고, 역할에 없는 도구는 채팅의 승인 카드로 묻습니다
- 프로젝트와 세션, 비서와의 대화 맥락은 앱을 다시 켜도 이어집니다

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

가짜 SDK로 도는 단위 테스트, 실제 Claude를 부르는 통합 테스트(비용 발생), 앱을 패키징한 뒤의 화면 테스트입니다.

```bat
npm test
npm run test:live
npm run test:e2e
```

## 참고

1. phykn, AI Crew 제품 구상, 2026. https://github.com/phykn/ai-crew
2. Anthropic, Claude Agent SDK, 2026. https://docs.claude.com/en/docs/claude-code/sdk
3. Electron Forge, Vite Plugin, 2026. https://www.electronforge.io/config/plugins/vite
