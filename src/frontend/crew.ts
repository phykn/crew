// How each shipped member looks in the camp: its name tag's color, and the sprite parts as head, upper, lower
export const LOOKS: Record<string, { color: string; look: [string, string, string] }> = {
  interpreter: { color: '#ff4b3e', look: ['hat', 'robe', 'gown'] },
  conductor: { color: '#9aa5ff', look: ['hair', 'armor', 'wraps'] },
  researcher: { color: '#e0a96d', look: ['hat', 'vest', 'greaves'] },
  coder: { color: '#2ee0c4', look: ['hood', 'tunic', 'boots'] },
  writer: { color: '#b8e04a', look: ['hat', 'tunic', 'wraps'] },
  reviewer: { color: '#c77dff', look: ['helm', 'armor', 'greaves'] },
  proofreader: { color: '#3d8bff', look: ['braids', 'vest', 'gown'] },
  tester: { color: '#ffd23f', look: ['helm', 'vest', 'boots'] },
  images: { color: '#ff6fb5', look: ['hood', 'robe', 'wraps'] },
  librarian: { color: '#8fd16a', look: ['braids', 'robe', 'boots'] },
};

// Each skill and MCP server of the crew folder as the permissions window shows it
export const KIT: Record<string, { icon: string; label: string; use: string }> = {
  brief: { icon: 'list', label: '요청 정리', use: '사용자 말을 목표, 범위, 완료 조건, 원문이 담긴 요청으로 정리' },
  plan: {
    icon: 'sparkle',
    label: '계획 수립',
    use: '업무를 맞는 멤버의 순서 있는 단계로 나누고, 실패하면 남은 것만 다시 계획',
  },
  research: {
    icon: 'book',
    label: '자료 조사',
    use: '웹, 문서, 프로젝트에서 사실을 찾아 공식 출처와 날짜를 붙여 보고',
  },
  code: { icon: 'code', label: '코드 작성', use: '요청한 것만, 프로젝트 방식대로, 빌드를 깨지 않고 코드를 바꿈' },
  conventions: {
    icon: 'ruler',
    label: '작성 기준',
    use: '파일, 화면, 백엔드 층, 이름, 주석, 코드 양에 대한 작성과 검토 기준',
  },
  write: { icon: 'scroll', label: '문서 작성', use: '요청한 대로, 결론 먼저, 모든 사실에 출처를 달아 문서를 씀' },
  'plan-review': {
    icon: 'clipboard',
    label: '계획 검토',
    use: '코드 작성 전에 계획의 범위, 순서, 구조, 완료 조건을 확인',
  },
  'code-review': {
    icon: 'eye',
    label: '코드 검토',
    use: '바뀐 코드의 범위, 정확성, 구조를 읽어서 확인하거나 프로젝트 전체를 검토',
  },
  'doc-review': { icon: 'palette', label: '문서 검토', use: '문서를 요청에 비춰 범위, 사실, 일관성, 명확성을 확인' },
  verify: {
    icon: 'bug',
    label: '시험 실행',
    use: '테스트를 돌리고 바뀐 화면을 브라우저로 써 보며 진짜 실패와 불안정한 실패를 가림',
  },
  wiki: {
    icon: 'book',
    label: '위키 정리',
    use: '기억, 업무 보고, 커밋을 모아 주제별 문서로 정리하고 어긋남과 빈 곳을 점검',
  },
  image: { icon: 'image', label: '이미지 설명', use: '이미지를 볼 수 없는 멤버를 위해 글자와 내용을 모두 글로 옮김' },
  verdict: {
    icon: 'check',
    label: '보고 형식',
    use: '문제마다 위치, 현상, 재현, 근거, 심각도를 적고 반드시 고칠 것이 있을 때만 반려',
  },
  browser: {
    icon: 'browser',
    label: '브라우저',
    use: '실제 브라우저(Playwright MCP)로 웹 페이지를 열고 조작하고 화면을 캡처',
  },
  app: { icon: 'list', label: '앱 조작', use: '통역이 이 앱의 창에서 사용자가 할 수 있는 일을 대신 함' },
};
