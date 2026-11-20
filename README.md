<div align="center">

# crew

비서 한 명에게 맡기고, AI 에이전트 팀이 일하는 모습을 픽셀 캠프에서 지켜보는 데스크톱 앱

![Electron](https://img.shields.io/badge/Electron-45-47848F) ![React](https://img.shields.io/badge/React-19-61DAFB) ![Claude Agent SDK](https://img.shields.io/badge/Claude_Agent_SDK-0.3-D97757) ![SQLite](https://img.shields.io/badge/node:sqlite-builtin-003B57)

</div>

- 로컬 폴더를 프로젝트로 열고 비서와 대화합니다. 그림을 붙여 보낼 수 있고, Ctrl+Enter로 보낸 메시지는 비서의 답이 끝날 때까지 기다렸다 갑니다. 할 일을 말하면 비서가 업무를 열고, 크루가 계획 → 계획 검토 → 개발 → 코드 리뷰, 시험, 표준 점검을 진행한 뒤 비서가 보고합니다
- 맞는 담당자가 없으면 인사가 새 담당자를 정규나 알바로 설계합니다
- 가드가 모든 도구 호출을 검사해 위험한 명령과 허용 범위 밖 쓰기를 막고, 역할에 없는 도구는 승인 모드(묻기, 자동, 전부)에 따라 카드로 묻거나 넘깁니다
- 범례에서 담당자별 별명, 모델, 고용과 도구, 쓰기 범위, 스킬, MCP 접근을 바꿉니다
- 오른쪽 탭에서 대화와 업무 카드, 단계별 로그와 사용량, 프로젝트 위키와 그래프, 업무 흐름 편집기를 봅니다. 프로젝트가 git 저장소면 로그의 파일 이름을 눌러 업무가 바꾼 내용을 팝업으로 봅니다
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

실행 파일은 `out/crew-win32-x64/crew.exe`에 만들어집니다.

```bat
npm run package
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
