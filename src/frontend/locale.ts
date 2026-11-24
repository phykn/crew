import { type Mode, type Say, baseKey } from '../shared';
import { josa, particle } from './korean';

// Each member's name on screen, which 통역 also uses when it talks to the user
export const ROLE_NAMES: Record<string, string> = {
  interpreter: '통역',
  conductor: '지휘',
  researcher: '조사',
  coder: '코드 작성',
  writer: '문서 작성',
  reviewer: '코드 검토',
  proofreader: '문서 검토',
  tester: '시험',
  images: '이미지',
  librarian: '기록',
};

// A member shows this until the user gives it a nickname of their own
export const NICKNAMES: Record<string, string> = {
  interpreter: '모아',
  conductor: '다온',
  researcher: '누리',
  coder: '모루',
  writer: '글비',
  reviewer: '세린',
  proofreader: '바름',
  tester: '시우',
  images: '빛나',
  librarian: '하람',
};

// Each workflow's name and its steps' names, for a workflow whose steps the user has not named
export const WORKFLOW_NAMES: Record<string, { label: string; steps: Record<string, string> }> = {
  code: {
    label: '코드 변경',
    steps: { plan: '계획', plan_review: '계획 검토', develop: '코드 작성', review: '코드 검토', test: '시험' },
  },
  doc: { label: '문서 작성', steps: { write: '문서 작성', review: '문서 검토' } },
  improve: { label: '개선 제안', steps: { structure: '구조 검토' } },
  research: { label: '조사', steps: { research: '조사' } },
  // A task given to one member alone: its step is the role followed by this word
  solo: { label: '단독', steps: { work: '작업' } },
};

export const MODE_LABELS: Record<Mode, string> = { manual: '묻기', auto: '자동', bypass: '전부' };

// An answer card's buttons; a pick-one card's options are task names and show as they are
export const ANSWER_LABELS: Record<string, string> = { allow: '허용', refuse: '거절', cancel: '취소' };
export const answerLabel = (o: string) => ANSWER_LABELS[o] ?? o;

// Each connection's name, and what it connects with
export const PROVIDER_NAMES: Record<string, { label: string; means: string }> = {
  'claude-subscription': { label: 'Claude 구독', means: 'Claude Code 로그인' },
  'claude-api': { label: 'Claude API', means: 'Anthropic API 키' },
};

const PERM_PARTS: Record<string, string> = { tool: '도구', skill: '스킬', mcp: 'MCP' };
const ACCESS: Record<string, string> = { all: '전체', read: '읽기만' };
// A guard line's reason is a code when the user was asked, and the guard's own words when it refused outright
const reason = (r: unknown) => (typeof r === 'object' && r ? say(r as Say) : String(r));

// A member named by key in a record line, as the screen names it
export const roleName = (key: unknown) => ROLE_NAMES[baseKey(String(key))] ?? String(key);

// Each record line and reason, worded from its code; an unknown code shows as itself
export function say(s: Say): string {
  const a = s as unknown as Record<string, never>;
  const step = String(a.step ?? '');
  const role = roleName(a.role);
  switch (s.code) {
    case 'task.start':
      return `${a.title} 업무 시작`;
    case 'task.more':
      return `${a.title} 업무 추가 요청: ${a.text}`;
    case 'task.reopen':
      return `${a.title} 업무 다시 진행: ${a.text}`;
    case 'task.stopRequest':
      return `${a.title} 업무 중단 요청`;
    case 'task.stopped':
      return `${a.title} 업무 중단됨`;
    case 'task.resume':
      return `${a.title} 업무 재개`;
    case 'task.stage':
      return `${a.stage} 진행`;
    case 'task.done':
      return `${a.title} 업무 완료`;
    case 'task.limit':
      return `${a.title} 업무 사용 한도로 멈춤`;
    case 'task.replan':
      return `${a.title} 다시 계획: ${say(a.why)}`;
    case 'task.fail':
      return `${a.title} 업무 실패: ${say(a.why)}`;
    case 'task.restarted':
      return '앱이 다시 시작되어 업무가 멈췄습니다';
    case 'overLimit':
      return `${josa(step, '을')} ${a.loops}번 고쳤지만 검증을 통과하지 못했습니다`;
    case 'noChange':
      return `${josa(step, '이')} 다시 했지만 바뀐 것이 없는데 또 되돌려졌습니다. 지적과 지시가 맞지 않아 사용자 결정이 필요합니다`;
    case 'retries':
      return `${josa(step, '이')} ${a.n}번 다시 시도해도 실패했습니다`;
    case 'absent':
      return `${josa(role, '이')} 고용되어 있지 않아 ${josa(step, '을')} 진행할 수 없습니다. 다른 담당자를 붙여야 합니다`;
    case 'stopped':
      return '중단되었습니다';
    case 'step.incomplete':
      return `${role}: ${step} 인계 보완 요청 — ${(a.missing as string[]).join(', ')} 없음`;
    case 'step.done':
      return `${role}: ${step} ${a.verdict === 'rework' ? '수정 요청' : '완료'}${a.summary === step ? '' : ` — ${a.summary}`}`;
    case 'step.failed':
      return `${role}: ${step} 실패 (${a.n}번 다시 시도)`;
    case 'guard.denied':
      return `${a.tool} 거부: ${reason(a.reason)}`;
    case 'guard.auto':
      return `${a.tool} 자동 승인: ${reason(a.reason)}`;
    case 'guard.approved':
      return `${a.tool} 승인: ${reason(a.reason)}`;
    case 'guard.refused':
      return `${a.tool} 거절: ${reason(a.reason)}`;
    case 'reason.tool':
      return `${a.tool} 도구가 역할에 없습니다`;
    case 'reason.server':
      return `${a.server} MCP 서버가 역할에 없습니다`;
    case 'reason.readOnly':
      return `${josa(String(a.server), '을')} 읽기로만 쓸 수 있어 ${josa(String(a.name), '을')} 쓰려면 승인이 필요합니다`;
    case 'card.approval':
      return `${role} ${a.nickname}: ${reason(a.reason)}.${a.what ? `\n${a.what}` : ''}`;
    case 'card.whichTask':
      return '어느 업무를 말씀하시나요?';
    case 'card.redo':
      return `어느 업무를 다시 할까요?\n${a.change}`;
    case 'confirm.deleteSession':
      return `세션 ${josa(`#${a.session}`, '을')} 지울까요? 업무 ${a.tasks}개와 기록 ${a.events}줄이 함께 지워집니다.`;
    case 'confirm.hire':
      return `${role}(${a.nickname})${particle(role, '을')} ${a.hired ? '다시 고용할까요?' : '내보낼까요?'}`;
    case 'confirm.mode':
      return `승인 모드를 ${josa(MODE_LABELS[a.mode as Mode] ?? String(a.mode), '으로')} 바꿀까요?`;
    case 'chat.limit':
      return '모델 사용 한도에 도달해 답하지 못했습니다. 한도가 풀린 뒤 다시 말씀해 주세요.';
    case 'chat.stopped':
      return '답변을 멈췄습니다.';
    case 'chat.error':
      return `답하는 중 오류가 났습니다: ${a.error ?? '알 수 없는 오류'}`;
    case 'perm.copied':
      return '원본 권한 복사';
    case 'perm.change': {
      const parts = (a.parts as { what: string; sign: string; name: string }[]).map((p) => {
        const [server, access] = p.name.split(':');
        const name = p.what === 'mcp' ? `${server}(${ACCESS[access] ?? access})` : p.name;
        return `${PERM_PARTS[p.what] ?? p.what} ${p.sign}${name}`;
      });
      const write = a.write as [string, string] | null;
      if (write) parts.push(`쓰기 ${write[0]} → ${write[1]}`);
      return parts.join(', ') || '변경 없음';
    }
    case 'wf.dupId':
      return '단계 ID가 겹칩니다';
    case 'wf.noRole':
      return `${step}: 없는 역할 ${roleName(a.role)}`;
    case 'wf.noAfter':
      return `${step}: 없는 선행 단계 ${a.after}`;
    case 'wf.noRework':
      return `${step}: 판정 단계에 되돌릴 단계가 없습니다`;
    case 'wf.reworkLate':
      return `${step}: ${josa(String(a.rework), '은')} 앞선 단계가 아닙니다`;
    case 'wf.cycle':
      return '단계가 순환합니다';
    case 'wf.schema':
      return String(a.text);
    case 'wf.noTask':
      return '적용할 업무가 없습니다';
    case 'wf.notHere':
      return `이 프로젝트에 ${a.kind} 업무 #${a.task}이 없습니다`;
    case 'wf.stale':
      return `버전 ${a.base} 이후에 다른 변경이 저장되었습니다. 최신 규칙을 다시 읽고 고치세요`;
    case 'account.noLogin':
      return '이 컴퓨터에 Claude Code 로그인이 없습니다';
    case 'account.badKey':
      return '키가 맞지 않습니다';
    case 'account.status':
      return `Anthropic이 ${a.status}로 답했습니다`;
    case 'account.noAnswer':
      return '응답이 없습니다';
    case 'account.noKey':
      return '저장한 키가 없습니다';
    case 'account.other':
      return String(a.text);
    case 'member.leaving':
      return `${role}(${a.nickname}) 퇴장 예정: 맡은 단계를 마치고 나갑니다`;
    case 'member.left':
      return `${role}(${a.nickname}) 퇴장`;
    case 'request':
      return `${roleName(a.from)} → ${roleName(a.to)}: ${a.text}`;
    case 'write.wait':
      return `쓰기 예약 대기: 업무 ${josa(`#${(a.tasks as number[]).join(', #')}`, '이')} 같은 범위를 쓰는 중`;
    case 'write.stale':
      return `다시 읽어야 할 파일: ${(a.files as string[]).join(', ')}`;
    default:
      return s.code;
  }
}

// What plays over a member's head in the camp
export const CAMP_SCENES = {
  report: '완료 보고',
  failed: '업무 실패',
  note: '요청 메모',
  answer: '답변',
  stepFailed: '실패',
  rework: '수정 요청',
};
export const doing = (step: string) => (step === '?' ? step : `${step} 중`);

// What the window hands the main process at start, so 통역 and the record use the names the screen shows
export const NAMES = { roles: ROLE_NAMES, nicknames: NICKNAMES, workflows: WORKFLOW_NAMES, modes: MODE_LABELS };
