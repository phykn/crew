<div align="center">

# crew

비서 한 명에게 맡기고, AI 에이전트 팀이 일하는 모습을 픽셀 캠프에서 지켜보는 데스크톱 앱

![Electron](https://img.shields.io/badge/Electron-45-47848F) ![React](https://img.shields.io/badge/React-19-61DAFB) ![Claude Agent SDK](https://img.shields.io/badge/Claude_Agent_SDK-0.3-D97757) ![SQLite](https://img.shields.io/badge/node:sqlite-builtin-003B57)

</div>

- 로컬 폴더를 프로젝트로 열고 비서와 대화합니다. 할 일을 말하면 비서가 업무를 열고, 크루가 기획 → 계획 검토 → 개발 → 코드 리뷰·시험을 진행한 뒤 비서가 보고합니다
- 크루는 10명이고, 맞는 역할이 없으면 인사가 새 담당자를 정규나 알바로 데려옵니다. 알바가 만든 파일은 업무가 끝나면 프로젝트로 옮겨집니다
- 가드가 모든 도구 호출을 검사해 위험한 명령과 허용 범위 밖 쓰기를 막습니다. 역할에 없는 도구는 승인 모드(묻기·자동·전부)에 따라 묻거나 넘깁니다
- 범례에서 담당자별 별명·모델·고용 여부와 도구·쓰기 범위·스킬·MCP 접근을 바꿉니다
- 진행 중 업무는 대화창 위 카드로 보이고, 로그 탭에 단계별 인계와 사용량이 남습니다
- 메모리 탭에서 프로젝트 위키를 목록과 그래프로 보고, 담당자별 기억을 봅니다
- 워크플로우 탭에서 업무 흐름을 노드로 바꾸고, 저장할 때마다 규칙 버전이 남습니다
- 입력창에 `/`를 치면 `/clear`·`/log`·`/memory`·`/workflow` 명령이 뜹니다
- 왼쪽 캠프에서 크루가 모닥불 주변을 걷고, 일하는 사람 발밑에 마법진과 상태가 뜹니다. 캐릭터를 누르면 그 업무 로그가 열립니다

## 설치

[Claude Code](https://docs.claude.com/en/docs/claude-code/overview)에 로그인되어 있어야 하고, Node.js 24 이상이 필요합니다.

```bat
npm install
git config core.hooksPath scripts/hooks
```

훅을 켜 두면 커밋할 때마다 버전이 0.0.1씩 오르고, `out/crew-<버전>.bundle`에 저장소 번들이 하나만 남습니다.

## 실행

```bat
npm start
```

## 테스트

가짜 SDK로 도는 단위 테스트, 실제 Claude를 부르는 통합 테스트(비용 발생), 패키징한 앱의 화면 테스트입니다.

```bat
npm test
npm run test:live
npm run test:e2e
```

## 참고

1. phykn, AI Crew 제품 구상, 2026. https://github.com/phykn/ai-crew
2. Anthropic, Claude Agent SDK, 2026. https://docs.claude.com/en/docs/claude-code/sdk
3. Electron Forge, Vite Plugin, 2026. https://www.electronforge.io/config/plugins/vite
