import type { Member } from '../domain/records';
import type { ConversationRecords, ToolGate } from './ports';
import { checkCall, type Policy } from '../domain/policy';
import { ALLOW, REFUSE } from '../domain/answers';
import type { Questions } from './questions';

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
  // Holds the write reservation for an allowed call; a reason comes back when the call must not go ahead yet
  reserve: (tool: string, input: Record<string, unknown>) => Promise<string | null>;
};

// One member's guard inside one task: denials go to the log, approvals are asked in 비서's chat and kept for the task
export function guardMember({ store, questions, policy, sessionId, taskId, member, reserve }: GuardDeps): ToolGate {
  const record = (kind: 'denied' | 'approved' | 'refused', text: string) =>
    store.addEvent({ sessionId, taskId, memberId: member.id, kind, text, detail: null });
  const allow = async (tool: string, input: Record<string, unknown>) => {
    const late = await reserve(tool, input);
    return late
      ? ({ behavior: 'deny', message: late } as const)
      : ({ behavior: 'allow', updatedInput: input } as const);
  };
  const ask = async (tool: string, input: Record<string, unknown>, reason: string) => {
    const what = String(input.command ?? input.file_path ?? input.url ?? '').slice(0, 300);
    const answer = await questions.ask({
      sessionId,
      taskId,
      kind: 'approval',
      // The card itself says it asks, so it names only who and why
      prompt: `${policy().role} ${member.nickname}: ${reason}.${what ? `\n${what}` : ''}`,
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
      record('denied', `${tool} 거부: ${verdict.reason}`);
      return { behavior: 'deny', message: refused(verdict.reason) };
    }
    if (mode === 'auto') {
      record('approved', `${tool} 자동 승인: ${verdict.reason}`);
      return allow(tool, input);
    }
    // An approval already given for this tool in this task holds
    if (store.isGranted(sessionId, taskId, member.id, tool)) return allow(tool, input);
    const ok = await ask(tool, input, verdict.reason);
    record(ok ? 'approved' : 'refused', `${tool} ${ok ? '승인' : '거절'}: ${verdict.reason}`);
    // The permissions may have changed while the user was deciding; the approval answered the question as it was asked
    const now = checkCall(policy(), tool, input);
    if (ok && now.kind !== 'allow' && !(now.kind === 'ask' && now.reason === verdict.reason)) {
      return { behavior: 'deny', message: refused('permissions changed while waiting for approval') };
    }
    return ok ? allow(tool, input) : { behavior: 'deny', message: refused('the user did not allow it') };
  };
}
