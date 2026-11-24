import type { Member } from '../domain/records';
import type { ConversationRecords, ToolGate } from './ports';
import { checkCall, type Policy } from '../domain/policy';
import { ALLOW, REFUSE } from '../domain/answers';
import type { Questions } from './questions';
import type { Say } from '../../shared';

function refused(reason: string) {
  return `Blocked by the crew guard: ${reason}. Do not work around it; say what you needed and why when you hand back your work.`;
}

type GuardDeps = {
  store: ConversationRecords;
  questions: Questions;
  policy: () => Policy;
  sessionId: number;
  taskId: number | null;
  member: Member;
  nickname: string;
  // Holds the write reservation for an allowed call; a reason comes back when the call must not go ahead yet
  reserve: (tool: string, input: Record<string, unknown>) => Promise<string | null>;
};

// One member's guard inside one task: denials go to the log, approvals are asked in the interpreter's chat and kept for the task
export function guardMember({
  store,
  questions,
  policy,
  sessionId,
  taskId,
  member,
  nickname,
  reserve,
}: GuardDeps): ToolGate {
  const record = (kind: 'denied' | 'approved' | 'refused', say: Say) =>
    store.addEvent({ sessionId, taskId, memberId: member.id, kind, say, detail: null });
  const allow = async (tool: string, input: Record<string, unknown>) => {
    const late = await reserve(tool, input);
    return late
      ? ({ behavior: 'deny', message: late } as const)
      : ({ behavior: 'allow', updatedInput: input } as const);
  };
  const ask = async (tool: string, input: Record<string, unknown>, reason: Say) => {
    const what = String(input.command ?? input.file_path ?? input.url ?? '').slice(0, 300);
    const answer = await questions.ask({
      sessionId,
      taskId,
      kind: 'approval',
      // The card itself says it asks, so it names only who and why
      say: { code: 'card.approval', role: member.key, nickname, reason, what },
      // The last option is the card's main button, so allowing is the one that stands out
      options: [REFUSE, ALLOW],
      payload: { memberId: member.id, tool },
    });
    return answer === ALLOW;
  };
  return async (tool, input) => {
    const { mode } = policy();
    if (mode === 'bypass') return allow(tool, input);
    const verdict = checkCall(policy(), tool, input);
    if (verdict.kind === 'allow') return allow(tool, input);
    if (verdict.kind === 'deny') {
      record('denied', { code: 'guard.denied', tool, reason: verdict.reason });
      return { behavior: 'deny', message: refused(verdict.reason) };
    }
    if (mode === 'auto') {
      record('approved', { code: 'guard.auto', tool, reason: verdict.say });
      return allow(tool, input);
    }
    // An approval already given for this tool in this task holds
    if (store.isGranted(sessionId, taskId, member.id, tool)) return allow(tool, input);
    const ok = await ask(tool, input, verdict.say);
    record(ok ? 'approved' : 'refused', {
      code: ok ? 'guard.approved' : 'guard.refused',
      tool,
      reason: verdict.say,
    });
    // The permissions may have changed while the user was deciding; the approval answered the question as it was asked
    const now = checkCall(policy(), tool, input);
    if (ok && now.kind !== 'allow' && !(now.kind === 'ask' && now.reason === verdict.reason)) {
      return { behavior: 'deny', message: refused('permissions changed while waiting for approval') };
    }
    return ok ? allow(tool, input) : { behavior: 'deny', message: refused('the user did not allow it') };
  };
}
