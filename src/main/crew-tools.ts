import { z } from 'zod';
import { type Sdk, text } from './agent';
import type { Chat } from './chat';
import type { Member, PeerLine, Task } from './db';
import type { Step } from './workflow';
import { KEPT } from './crew';
import { readHelp } from './app-mcp';

const PeerAnswer = z.object({
  answer: z.string().describe('Your answer in Korean, or empty when you need to ask back first'),
  ask_back: z.string().optional().describe('A question for the asker when you cannot answer without it'),
});
const PEER_SCHEMA = z.toJSONSchema(PeerAnswer, { target: 'draft-7', io: 'input' }) as Record<string, unknown>;

// The app's own tools for 비서 in one session; a call is how 비서 opens real work for the crew
export function secretaryTools(sdk: Sdk, chat: Chat, sessionId: number) {
  const projectId = () => chat.store.projectOf(sessionId).id;
  const secretary = chat.store.readMember(projectId(), 'orchestrator');
  const kinds = chat.workflows.map((w) => w.kind) as [string, ...string[]];
  const memberOf = (name: string) => {
    const m = chat.findMember(projectId(), name);
    return m?.status === 'hired' ? m : null;
  };
  return sdk.createSdkMcpServer({
    name: 'crew',
    tools: [
      ...wikiTools(sdk, chat, secretary, sessionId, null),
      sdk.tool(
        'start_task',
        `Open a task for the crew when the request needs real work: changing files, research, or an improvement review. ` +
          `Kinds: ${chat.workflows.map((w) => `${w.kind} (${w.use})`).join('; ')}. ` +
          `The crew runs it on its own; you are told the result later and report it to the user then.`,
        {
          kind: z.enum(kinds),
          title: z.string().min(1).max(40).describe('A few Korean words naming the task, shown on its card'),
          request: z.string().min(1).describe("The user's request in full, with any scope you settled with them"),
          role: z
            .string()
            .optional()
            .describe(
              'Give the whole request to this one member instead, such as a temp you just hired: its key or Korean role',
            ),
        },
        async (a) => {
          const one = a.role ? memberOf(a.role) : null;
          if (a.role && !one) return text(`${a.role}은 지금 고용되어 있지 않습니다.`);
          const task = chat.tasks.start(sessionId, a.kind, a.title, a.request, one ?? undefined);
          return text(`업무 #${task.id} "${task.title}"을 시작했습니다.`);
        },
      ),
      sdk.tool('read_help', "Read the app's help before answering how to use the crew app.", {}, async () =>
        text(readHelp(chat.crew.dir)),
      ),
      sdk.tool(
        'ask_helper',
        'Hand 도우미 something the user wants done in the app itself: find a task, open a screen, resume work. Its answer comes back as the result.',
        { request: z.string().min(1).describe("The user's request in their words") },
        async (a) => {
          const helper = chat.store.readMember(projectId(), 'helper');
          const out = await chat.runMember(helper, sessionId, null, a.request);
          return text(out.status === 'done' ? out.text : `도우미가 답하지 못했습니다: ${out.error ?? out.status}`);
        },
      ),
      sdk.tool(
        'ask_tools',
        'Hand the tools member a request about skills or MCP servers: who should get or lose one, or what tool the crew lacks. Each change it makes waits for the user on a card. Its answer comes back as the result.',
        { request: z.string().min(1).describe("The user's request in their words") },
        async (a) => {
          const member = chat.store.readMember(projectId(), 'tools');
          if (member.status !== 'hired') return text('도구가 지금 고용되어 있지 않습니다.');
          const out = await chat.runMember(member, sessionId, null, a.request, {
            mcpServers: { crew: kitTools(sdk, chat, sessionId) },
          });
          return text(out.status === 'done' ? out.text : `도구가 답하지 못했습니다: ${out.error ?? out.status}`);
        },
      ),
      sdk.tool(
        'read_workflow',
        "Read a task kind's current rules for this project, with the version to base a change on.",
        { kind: z.enum(kinds) },
        async (a) => {
          const w = chat.workflowFor(projectId(), a.kind);
          return text(JSON.stringify({ version: w.version, rules: w.rules }));
        },
      ),
      sdk.tool(
        'change_workflow',
        'Save changed rules for a task kind, based on the version you read. scope: future (앞으로, new tasks), current (이번 업무에도: also the remaining steps of task_id), once (이번에만: task_id only, not saved for later).',
        {
          kind: z.enum(kinds),
          base_version: z.number().int(),
          rules: z.record(z.string(), z.unknown()),
          scope: z.enum(['future', 'current', 'once']),
          task_id: z.number().int().optional(),
          reason: z.string().optional().describe("Why, in Korean; kept as the rule's decision document in the wiki"),
        },
        async (a) => {
          const r = chat.saveWorkflow({
            projectId: projectId(),
            kind: a.kind,
            base: a.base_version,
            rules: a.rules,
            author: '비서',
            scope: a.scope,
            taskId: a.task_id,
          });
          // A rule saved for later gets its decision document, tied to the version it made
          if (r.ok && a.reason && a.scope !== 'once') {
            chat.wiki.write(
              projectId(),
              `워크플로우: ${a.kind}`,
              a.reason,
              { memberId: secretary.id, name: '비서' },
              { kind: a.kind, version: r.version },
            );
            chat.emit('changed', 'wiki');
          }
          return text(r.ok ? `저장했습니다 (버전 ${r.version}).` : `저장하지 않았습니다: ${r.problems.join('; ')}`);
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
        { role: z.string().describe('The member: its key or Korean role') },
        async (a) => {
          const m = memberOf(a.role);
          if (!m) return text(`${a.role}은 지금 고용되어 있지 않습니다.`);
          if (KEPT.includes(m.key)) return text(`${a.role}은 내보낼 수 없습니다.`);
          if (!chat.fire(m.id)) return text(`${a.role}(${m.nickname})은 이미 퇴장 중입니다.`);
          return text(`${a.role}(${m.nickname}) 퇴장 처리했습니다.`);
        },
      ),
      sdk.tool(
        'reassign',
        "Give a task's steps from a member who left to another, such as a new temp, before reopening or resuming it. The new member gets the saved handback.",
        {
          task_id: z.number().int(),
          from_role: z.string().describe('Key or Korean role'),
          to_role: z.string().describe('Key or Korean role'),
        },
        async (a) => {
          const to = memberOf(a.to_role);
          if (!to) return text(`${a.to_role}은 지금 고용되어 있지 않습니다.`);
          // The member who left is no longer hired, so it is looked up among everyone
          const from = chat.findMember(projectId(), a.from_role);
          if (!from) return text(`${a.from_role}은 크루에 없습니다.`);
          const task = chat.store.listTasks(sessionId).find((t) => t.id === a.task_id);
          if (!task) return text(`업무 #${a.task_id}는 이 세션에 없습니다.`);
          const moved = chat.tasks.reassign(task, chat.crew.defOf(from).role, to);
          return text(
            moved.length
              ? `${moved.join(', ')} 단계를 ${a.to_role}에게 넘겼습니다.`
              : `${a.from_role}이 맡은 단계가 없습니다.`,
          );
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
          if (!task) return text(a.task_id ? `업무 #${a.task_id}는 이 세션에 없습니다.` : '다시 열 업무가 없습니다.');
          const ok = chat.tasks.reopen(task.id, a.change);
          return text(
            ok
              ? `업무 #${task.id}를 다시 진행합니다.`
              : `업무 #${task.id}는 지금 다시 열 수 없습니다 (${task.status}).`,
          );
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
            if (!task) return text(`업무 #${a.task_id}는 이 세션에 없습니다.`);
            const ok = verb === 'stop' ? chat.tasks.stop(task.id) : chat.tasks.resume(task.id);
            return text(
              ok
                ? `업무 #${task.id}: ${verb === 'stop' ? '중단' : '재개'}했습니다.`
                : `업무 #${task.id}는 지금 ${task.status} 상태라 할 수 없습니다.`,
            );
          },
        ),
      ),
    ],
  });
}

// Reading and writing the project wiki and one's own memory, for 비서 and members alike
function wikiTools(sdk: Sdk, chat: Chat, member: Member, sessionId: number, taskId: number | null) {
  const { store, wiki } = chat;
  const projectId = store.projectOf(sessionId).id;
  const by = () => ({ memberId: member.id, name: chat.crew.defOf(store.readMemberById(member.id)).role, taskId });
  return [
    sdk.tool('wiki_read', 'Read one project wiki document by its title.', { title: z.string() }, async (a) => {
      const doc = wiki.find(projectId, a.title);
      return text(
        doc
          ? `# ${doc.title}\n\n${doc.body}`
          : `"${a.title}" is not in the wiki. Documents: ${
              wiki
                .list(projectId)
                .map((d) => d.title)
                .join(', ') || 'none'
            }`,
      );
    }),
    sdk.tool(
      'wiki_write',
      'Create or replace a project wiki document: decisions, reasons, how to test, what later tasks should know. Read it first and keep what is still right.',
      {
        title: z.string().min(1).max(60),
        body: z.string().min(1),
        files: z.array(z.string()).default([]).describe('Project files it is about'),
      },
      async (a) => {
        const old = wiki.find(projectId, a.title);
        wiki.write(projectId, a.title, a.body, { ...by(), files: a.files });
        chat.emit('changed', 'wiki');
        return text(`${old ? '수정' : '작성'}: ${a.title}`);
      },
    ),
    sdk.tool(
      'remember',
      'Keep a note only you need in later runs in this project.',
      { text: z.string().min(1) },
      async (a) => {
        wiki.remember(projectId, member.id, a.text, { taskId, sessionId });
        chat.emit('changed', 'wiki');
        return text('기억했습니다.');
      },
    ),
  ];
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
      ...wikiTools(sdk, chat, member, task.sessionId, task.id),
      sdk.tool(
        'ask_peer',
        'Ask another crew member directly for a check or an answer you need for your step, such as 표준 for a naming question. ' +
          'Their answer comes back as the result. If they ask you back, call again with the same request_id and your reply.',
        {
          role: z.string().describe('The member to ask: its key, such as stylist, or its Korean role'),
          message: z.string().describe('Your question, or your reply to their question'),
          expected: z.string().default('').describe('What you need back'),
          request_id: z.number().int().optional().describe('The request you are continuing'),
        },
        async (a) => text(await askPeer(chat, task, step, member, a)),
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
  const peer = chat.findMember(store.projectOf(task.sessionId).id, a.role);
  if (!peer) return `${a.role} is not a crew member.`;
  if (peer.status !== 'hired') return `${a.role} is not hired now; say so in your handback.`;
  // Each member works one run at a time, so asking oneself, or a member at work, would wait on a run that waits on this one
  if (peer.id === member.id) return 'You cannot ask yourself; decide it in your step.';
  // The record names the peer by its role, however it was asked for
  const to = crew.defOf(peer).role;
  const busy = () =>
    `${to} is at work on its own step now; decide without it and note the open question in your handback.`;
  // Refused before a request is recorded, so a busy peer leaves no empty thread behind
  if (a.request_id === undefined && chat.busy(peer.id)) return busy();
  const id =
    a.request_id ??
    store.createRequest({
      taskId: task.id,
      stepId: step.id,
      fromMember: member.id,
      toRole: to,
      expected: a.expected ?? '',
    });
  const req = store.readRequest(id);
  if (req.taskId !== task.id) return `Request ${id} belongs to another task.`;
  const from = crew.defOf(member).role;
  // A resent line that was already answered is not run again: the answer on record is returned
  const at = req.thread.findIndex((l, i) => l.from === from && l.text === a.message && req.thread[i + 1]);
  if (at >= 0) return reply(id, req.thread[at + 1]);
  if (chat.busy(peer.id)) return busy();
  const thread: PeerLine[] = [...req.thread, { from, text: a.message }];
  store.writeThread(id, thread);
  store.addEvent({
    sessionId: task.sessionId,
    taskId: task.id,
    memberId: member.id,
    kind: 'request',
    text: `${from} → ${to}: ${a.message}`,
    detail: JSON.stringify({ requestId: id }),
  });
  const prompt = [
    `[Request #${id} in task #${task.id} "${task.title}"] ${from} asks you during the step ${step.label}.`,
    req.expected ? `They need: ${req.expected}` : '',
    thread.map((l) => `${l.from}: ${l.text}`).join('\n'),
    'Answer it, or ask back one question if you cannot answer without it. Answer in Korean.',
  ]
    .filter(Boolean)
    .join('\n\n');
  const out = await chat.runMember(peer, task.sessionId, task.id, prompt, {
    schema: PEER_SCHEMA,
    alive: () => !chat.tasks.halted(task.id),
  });
  const parsed = PeerAnswer.safeParse(out.structured);
  const line: PeerLine = parsed.success
    ? { from: to, text: parsed.data.ask_back ? `?${parsed.data.ask_back}` : parsed.data.answer }
    : { from: to, text: `!${out.error ?? 'no answer'}` };
  store.writeThread(id, [...thread, line]);
  store.addEvent({
    sessionId: task.sessionId,
    taskId: task.id,
    memberId: peer.id,
    kind: 'request',
    text: `${to} → ${from}: ${line.text}`,
    detail: JSON.stringify({ requestId: id }),
  });
  return reply(id, line);
}

function reply(id: number, line: PeerLine) {
  if (line.text.startsWith('?'))
    return `Request ${id}: ${line.from} asks back: ${line.text.slice(1)} Reply with ask_peer, request_id ${id}.`;
  if (line.text.startsWith('!')) return `Request ${id}: ${line.from} could not answer (${line.text.slice(1)}).`;
  return `Request ${id}: ${line.from} answers: ${line.text}`;
}

// The tools member's view of the kit and its one way to change it: a proposal the user approves on a card
function kitTools(sdk: Sdk, chat: Chat, sessionId: number) {
  const { store, crew } = chat;
  const projectId = store.projectOf(sessionId).id;
  const hired = () => store.listMembers(projectId).filter((m) => m.status === 'hired');
  return sdk.createSdkMcpServer({
    name: 'crew',
    tools: [
      sdk.tool(
        'read_kit',
        'Read every skill and MCP server in the kit, and which hired member holds which.',
        {},
        async () => {
          const kit = [
            ...Object.entries(crew.kit.skills).map(([name, k]) => `- skill ${name}: ${k.use}`),
            ...Object.entries(crew.kit.mcp).map(([name, k]) => `- mcp ${name}: ${k.use}`),
          ];
          const holders = hired().map((m) => {
            const s = chat.settings(m);
            return `- ${m.key} (${crew.defOf(m).role}${m.temp ? ', temp' : ''}): skills ${s.skills.join(', ') || 'none'}; mcp ${s.mcp.map((x) => `${x.server}(${x.access})`).join(', ') || 'none'}`;
          });
          return text(['# Kit', ...kit, '# Members', ...holders].join('\n'));
        },
      ),
      sdk.tool(
        'assign',
        "Propose one member's new full list of skills and/or MCP servers. The user approves or cancels it on a card; the answer says which.",
        {
          member: z.string().describe('The member: its key or Korean role'),
          skills: z.array(z.string()).optional().describe('Its full new list of skills'),
          mcp: z
            .array(z.object({ server: z.string(), access: z.enum(['all', 'read']) }))
            .optional()
            .describe('Its full new list of MCP servers'),
          reason: z.string().min(1).describe('Why, in Korean, for the card'),
        },
        async (a) => {
          const m = chat.findMember(projectId, a.member);
          if (m?.status !== 'hired') return text(`${a.member} is not a hired member.`);
          if (m.temp && a.mcp?.length) return text('A temp gets no MCP server.');
          const config = { ...(a.skills ? { skills: a.skills } : {}), ...(a.mcp ? { mcp: a.mcp } : {}) };
          try {
            crew.checkConfig(config);
          } catch (err) {
            return text(String(err));
          }
          const shown = [
            ...(a.skills ? [`스킬: ${a.skills.map((s) => crew.kit.skills[s].label).join(', ') || '없음'}`] : []),
            ...(a.mcp
              ? [
                  `MCP: ${a.mcp.map((x) => `${crew.kit.mcp[x.server].label}(${x.access === 'all' ? '전체' : '읽기'})`).join(', ') || '없음'}`,
                ]
              : []),
          ];
          const choice = await chat.questions.ask({
            sessionId,
            taskId: null,
            kind: 'choice',
            prompt: `도구가 ${crew.defOf(m).role}(${m.nickname})의 권한을 바꾸려 합니다.\n${shown.join('\n')}\n${a.reason}`,
            options: ['취소', '적용'],
            payload: {},
          });
          if (choice !== '적용') return text('The user cancelled this change; do not propose it again.');
          chat.setPermissions(m.id, config);
          chat.emit('changed', 'members');
          return text(`Applied to ${m.key}.`);
        },
      ),
    ],
  });
}
