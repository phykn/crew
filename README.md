<div align="center">

# AI Crew

비서 한 명에게 맡기고, Claude 에이전트 팀이 일하는 모습을 픽셀 캠프에서 지켜보는 데스크톱 앱

![Electron](https://img.shields.io/badge/Electron-45-47848F) ![React](https://img.shields.io/badge/React-19-61DAFB) ![Claude Agent SDK](https://img.shields.io/badge/Claude_Agent_SDK-0.3-D97757) ![SQLite](https://img.shields.io/badge/node:sqlite-builtin-003B57)

</div>

- 로컬 폴더를 프로젝트로 열고 세션별로 비서와 대화합니다. 할 일을 말하면 비서가 업무를 열고, 크루가 기획 → 계획 검토 → 개발 → 코드 리뷰·시험(병렬)을 스스로 진행한 뒤 비서가 보고합니다
- 크루는 비서·인사·도구·기획·개발·리뷰·시험·표준·조사·그림·도우미 11명입니다. 맞는 역할이 없으면 인사가 새 담당자를 설계해 정규나 알바로 데려옵니다
- 범례에서 별명·모델·고용 여부와 각자의 도구·쓰기 범위·스킬·MCP 접근(전체/읽기만)을 바꿉니다
- 가드가 모든 도구 호출을 검사해 push·재귀 삭제·전역 설치·허용 범위 밖 쓰기를 막고, 역할에 없는 도구는 채팅의 답변 카드로 묻습니다. 같은 파일을 쓰는 업무끼리는 순서대로 진행합니다
- 진행 중 업무는 대화창 위 고정 카드로 보이고 중단·재개·로그를 누를 수 있습니다. 로그 탭에는 단계별 인계(변경 파일·검토 의견·테스트 출력)와 역할·모델별 사용량이 있습니다
- 메모리 탭에서 프로젝트 위키(변경 타임라인)와 담당자별 기억을 봅니다
- 프로젝트 메뉴의 **워크플로우 편집…** 에서 업무 흐름을 노드로 그려 바꾸고, 저장할 때마다 규칙 버전이 남습니다
- 앱 사용법은 비서에게 물으면 도움말로 답하고, "로그 열어줘"·"이어서 해줘" 같은 앱 조작은 도우미가 합니다
- `/clear`로 같은 크루의 새 세션을 열고, 프로젝트 트리에서 세션 삭제 전 지워질 업무·로그 수를 봅니다
- 왼쪽 캠프에서 크루가 모닥불 주변을 걷고, 업무가 배정되면 비서가 걸어가 맡기며, 일하는 사람 발밑에 마법진과 상태가 뜹니다. 캐릭터를 누르면 그 업무 로그가 열립니다

![캠프](docs/camp.png)

## 설치

[Claude Code](https://docs.claude.com/en/docs/claude-code/overview)에 로그인되어 있어야 하고, Node.js 24 이상이 필요합니다.

```bat
npm install
```

## 실행

```bat
npm start
```

## 배포용 묶음

```bat
npm run make
```

`out/make/zip/`에 압축 파일이 생깁니다.

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
