import { z } from 'zod';
import type { Sdk } from './agent';
import type { Chat } from './chat';
import type { Member, PeerLine, Task } from './db';
import type { Step } from './workflow';
import { KEPT } from './crew';

const PeerAnswer = z.object({
  answer: z.string().describe('Your answer in Korean, or empty when you need to ask back first'),
  ask_back: z.string().optional().describe('A question for the asker when you cannot answer without it'),
});
const PEER_SCHEMA = z.toJSONSchema(PeerAnswer, { target: 'draft-7', io: 'input' }) as Record<string, unknown>;

// The app's own tools for 비서 in one session; a call is how 비서 opens real work for the crew
export function secretaryTools(sdk: Sdk, chat: Chat, sessionId: number) {
  const kinds = chat.workflows.map((w) => w.kind) as [string, ...string[]];
  const memberOf = (role: string) => {
    const project = chat.store.readProject(chat.store.readSession(sessionId).projectId);
    return chat.store.listMembers(project.id).find((m) => m.status === 'hired' && chat.crew.defOf(m).role === role) ?? null;
  };
  const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });
  return sdk.createSdkMcpServer({
    name: 'crew',
    tools: [
      sdk.tool(
        'start_task',
        `Open a task for the crew when the request needs real work: changing files, research, or an improvement review. ` +
          `Kinds: ${chat.workflows.map((w) => `${w.kind} (${w.use})`).join('; ')}. ` +
          `The crew runs it on its own; you are told the result later and report it to the user then.`,
        {
          kind: z.enum(kinds),
          title: z.string().min(1).max(40).describe('A few Korean words naming the task, shown on its card'),
          request: z.string().min(1).describe("The user's request in full, with any scope you settled with them"),
          role: z.string().optional().describe('Give the whole request to this one member instead, such as a temp you just hired (Korean role)'),
        },
        async (a) => {
          const one = a.role ? memberOf(a.role) : null;
          if (a.role && !one) return text(`${a.role}은 지금 고용되어 있지 않습니다.`);
          const task = chat.tasks.start(sessionId, a.kind, a.title, a.request, one ?? undefined);
          return text(`업무 #${task.id} "${task.title}"을 시작했습니다.`);
        },
      ),
      sdk.tool(
        'hire',
        'When no member fits the work, have 인사 design one. A temp (알바) joins for this work and leaves when it is done; a regular stays.',
        { need: z.string().min(1).describe('The work no one fits'), temp: z.boolean() },
        async (a) => text(await chat.hire(sessionId, a.need, a.temp)),
      ),
      sdk.tool(
        'fire',
        'Let a member go when the user asks, or a temp whose work is done. One at work finishes or hands back its step first.',
        { role: z.string() },
        async (a) => {
          const m = memberOf(a.role);
          if (!m) return text(`${a.role}은 지금 고용되어 있지 않습니다.`);
          if (KEPT.includes(m.key)) return text(`${a.role}은 내보낼 수 없습니다.`);
          chat.fire(m.id);
          return text(`${a.role}(${m.nickname}) 퇴장 처리했습니다.`);
        },
      ),
      sdk.tool(
        'reassign',
        "Give a task's steps from a member who left to another, such as a new temp, before reopening or resuming it. The new member gets the saved handback.",
        { task_id: z.number().int(), from_role: z.string(), to_role: z.string() },
        async (a) => {
          const to = memberOf(a.to_role);
          if (!to) return text(`${a.to_role}은 지금 고용되어 있지 않습니다.`);
          const task = chat.store.listTasks(sessionId).find((t) => t.id === a.task_id);
          if (!task) return text(`업무 #${a.task_id}는 이 세션에 없습니다.`);
          const moved = chat.tasks.reassign(task, a.from_role, to);
          return text(moved.length ? `${moved.join(', ')} 단계를 ${a.to_role}에게 넘겼습니다.` : `${a.from_role}이 맡은 단계가 없습니다.`);
        },
      ),
      sdk.tool(
        'reopen_task',
        'When the user asks to change the result of a finished task, reopen that same task with what they want changed instead of starting a new one. ' +
          'Leave task_id out when the user did not say which task ("그거 다시 해줘"): the app then asks the user with a card. A separate request is a new task.',
        {
          task_id: z.number().int().optional(),
          change: z.string().min(1).describe('What the user wants changed, in their words'),
        },
        async (a) => {
          const task = await pickTask(chat, sessionId, a.task_id, a.change);
          if (!task) return { content: [{ type: 'text', text: a.task_id ? `업무 #${a.task_id}는 이 세션에 없습니다.` : '다시 열 업무가 없습니다.' }] };
          const ok = chat.tasks.reopen(task.id, a.change);
          return { content: [{ type: 'text', text: ok ? `업무 #${task.id}를 다시 진행합니다.` : `업무 #${task.id}는 지금 다시 열 수 없습니다 (${task.status}).` }] };
        },
      ),
      ...(['stop', 'resume'] as const).map((verb) =>
        sdk.tool(
          `${verb}_task`,
          verb === 'stop'
            ? 'Stop one task the user asks you to stop. Other tasks keep going.'
            : 'Continue a stopped or failed task when the user asks, from the steps it has not finished.',
          { task_id: z.number().int() },
          async (a) => {
            const task = chat.store.listTasks(sessionId).find((t) => t.id === a.task_id);
            if (!task) return { content: [{ type: 'text', text: `업무 #${a.task_id}는 이 세션에 없습니다.` }] };
            const ok = verb === 'stop' ? chat.tasks.stop(task.id) : chat.tasks.resume(task.id);
            return { content: [{ type: 'text', text: ok ? `업무 #${task.id}: ${verb === 'stop' ? '중단' : '재개'}했습니다.` : `업무 #${task.id}는 지금 ${task.status} 상태라 할 수 없습니다.` }] };
          },
        ),
      ),
    ],
  });
}

// Which task an unnamed follow-up means: the only finished one, or the one the user picks from a card
async function pickTask(chat: Chat, sessionId: number, id: number | undefined, change: string) {
  const tasks = chat.store.listTasks(sessionId);
  if (id) return tasks.find((t) => t.id === id) ?? null;
  const done = tasks.filter((t) => t.status === 'done');
  if (done.length <= 1) return done[0] ?? null;
  const label = (t: Task) => `#${t.id} ${t.title}`;
  // Held until the user answers: reopening the wrong task would redo finished work
  const choice = await chat.questions.ask({
    sessionId,
    taskId: null,
    kind: 'choice',
    prompt: `"${change}" — 어느 업무를 다시 할까요?`,
    options: done.map(label),
    payload: {},
  });
  return done.find((t) => label(t) === choice) ?? null;
}

// The app's tools for a member at work on one step: asking a colleague without going through 비서
export function memberTools(sdk: Sdk, chat: Chat, task: Task, step: Step, member: Member) {
  return sdk.createSdkMcpServer({
    name: 'crew',
    tools: [
      sdk.tool(
        'ask_peer',
        'Ask another crew member directly for a check or an answer you need for your step, such as 표준 for a naming question. ' +
          'Their answer comes back as the result. If they ask you back, call again with the same request_id and your reply.',
        {
          role: z.string().describe('The Korean role to ask, such as 표준'),
          message: z.string().describe('Your question, or your reply to their question'),
          expected: z.string().default('').describe('What you need back'),
          request_id: z.number().int().optional().describe('The request you are continuing'),
        },
        async (a) => ({ content: [{ type: 'text', text: await askPeer(chat, task, step, member, a) }] }),
      ),
    ],
  });
}

export async function askPeer(
  chat: Chat,
  task: Task,
  step: Step,
  member: Member,
  a: { role: string; message: string; expected?: string; request_id?: number },
) {
  const { store, crew } = chat;
  const project = store.readProject(store.readSession(task.sessionId).projectId);
  const peer = store.listMembers(project.id).find((m) => crew.defOf(m).role === a.role);
  if (!peer) return `${a.role} is not a crew role.`;
  if (peer.status !== 'hired') return `${a.role} is not hired now; tell 비서 in your handback.`;
  const id =
    a.request_id ??
    store.createRequest({ taskId: task.id, stepId: step.id, fromMember: member.id, toRole: a.role, expected: a.expected ?? '' });
  const req = store.readRequest(id);
  if (req.taskId !== task.id) return `Request ${id} belongs to another task.`;
  const from = crew.defOf(member).role;
  // A resent line that was already answered is not run again: the answer on record is returned
  const at = req.thread.findIndex((l, i) => l.from === from && l.text === a.message && req.thread[i + 1]);
  if (at >= 0) return reply(id, req.thread[at + 1]);
  const thread: PeerLine[] = [...req.thread, { from, text: a.message }];
  store.writeThread(id, thread);
  store.addEvent({ sessionId: task.sessionId, taskId: task.id, memberId: member.id, kind: 'request', text: `${from} → ${a.role}: ${a.message}`, detail: JSON.stringify({ requestId: id }) });
  const prompt = [
    `[Request #${id} in task #${task.id} "${task.title}"] ${from} asks you during the step ${step.label}.`,
    req.expected ? `They need: ${req.expected}` : '',
    thread.map((l) => `${l.from}: ${l.text}`).join('\n'),
    'Answer it, or ask back one question if you cannot answer without it. Answer in Korean.',
  ]
    .filter(Boolean)
    .join('\n\n');
  const out = await chat.runMember(peer, task.sessionId, task.id, prompt, { schema: PEER_SCHEMA });
  const parsed = PeerAnswer.safeParse(out.structured);
  const line: PeerLine = parsed.success
    ? { from: a.role, text: parsed.data.ask_back ? `?${parsed.data.ask_back}` : parsed.data.answer }
    : { from: a.role, text: `!${out.error ?? 'no answer'}` };
  store.writeThread(id, [...thread, line]);
  store.addEvent({ sessionId: task.sessionId, taskId: task.id, memberId: peer.id, kind: 'request', text: `${a.role} → ${from}: ${line.text}`, detail: JSON.stringify({ requestId: id }) });
  return reply(id, line);
}

function reply(id: number, line: PeerLine) {
  if (line.text.startsWith('?')) return `Request ${id}: ${line.from} asks back: ${line.text.slice(1)} Reply with ask_peer, request_id ${id}.`;
  if (line.text.startsWith('!')) return `Request ${id}: ${line.from} could not answer (${line.text.slice(1)}).`;
  return `Request ${id}: ${line.from} answers: ${line.text}`;
}
