import { z } from 'zod';
import { type Sdk, text } from '../agents/run';
import type { Chat } from '../chat';
import type { Task } from '../db';
import { kitTools } from './kit';
import { wikiTools } from './wiki';
import { josa } from '../../korean';

// The app's own tools for 비서 in one session; a call is how 비서 opens real work for the crew
export function secretaryTools(sdk: Sdk, chat: Chat, sessionId: number) {
  const projectId = () => chat.store.projectOf(sessionId).id;
  const secretary = chat.store.readMember(projectId(), 'orchestrator');
  const kinds = chat.workflows.shipped.map((w) => w.kind) as [string, ...string[]];
  const memberOf = (name: string) => {
    const m = chat.members.find(projectId(), name);
    return m?.status === 'hired' ? m : null;
  };
  return sdk.createSdkMcpServer({
    name: 'crew',
    tools: [
      ...wikiTools(sdk, chat, secretary, sessionId, null),
      sdk.tool(
        'start_task',
        `Open a task for the crew when the request needs real work: changing files, research, or an improvement review. ` +
          `Kinds: ${chat.workflows.shipped.map((w) => `${w.kind} (${w.use})`).join('; ')}. ` +
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
          size: z
            .enum(['small', 'large'])
            .default('large')
            .describe(
              'For a code change: small when it stays within one or two files and needs no design choice, which skips the plan and its review',
            ),
        },
        async (a) => {
          const one = a.role ? memberOf(a.role) : null;
          if (a.role && !one) return text(`${josa(a.role, '은')} 지금 고용되어 있지 않습니다.`);
          const task = chat.tasks.start(sessionId, a.kind, a.title, a.request, one ?? undefined, a.size === 'small');
          return text(`업무 #${task.id} ${josa(`"${task.title}"`, '을')} 시작했습니다.`);
        },
      ),
      sdk.tool(
        'ask_tools',
        "Hand the tools member a request about the crew's skills: make, change, or delete one, or decide who holds which skill or MCP server. Each change it makes waits for the user on a card. Its answer comes back as the result.",
        { request: z.string().min(1).describe("The user's request in their words") },
        async (a) => {
          const member = chat.store.readMember(projectId(), 'tools');
          if (member.status !== 'hired') return text('도구가 지금 고용되어 있지 않습니다.');
          const out = await chat.runs.run(member, sessionId, null, a.request, {
            mcpServers: { crew: kitTools(sdk, chat, sessionId) },
          });
          return text(out.status === 'done' ? out.text : `도구가 답하지 못했습니다: ${out.error ?? out.status}`);
        },
      ),
      sdk.tool(
        'ask_member',
        'Ask a member about its work, such as what it is doing now, what it found, or why it chose something, without disturbing it: a copy of its session answers and its work goes on untouched. Words meant to change the work go to reopen_task instead.',
        {
          role: z.string().describe("The member's key or Korean role"),
          question: z.string().min(1).describe("The user's question in their words"),
        },
        async (a) => {
          const member = memberOf(a.role);
          if (!member) return text(`${josa(a.role, '은')} 지금 고용되어 있지 않습니다.`);
          const role = chat.crew.defOf(member).role;
          const out = await chat.runs.ask(member, sessionId, a.question);
          if (!out) return text(`${josa(role, '은')} 이 세션에서 아직 일하지 않아 물어볼 대화가 없습니다.`);
          return text(
            out.status === 'done' ? out.text : `${josa(role, '이')} 답하지 못했습니다: ${out.error ?? out.status}`,
          );
        },
      ),
      sdk.tool(
        'read_workflow',
        "Read a task kind's current rules for this project, with the version to base a change on.",
        { kind: z.enum(kinds) },
        async (a) => {
          const w = chat.workflows.current(projectId(), a.kind);
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
          const r = chat.workflows.save({
            projectId: projectId(),
            kind: a.kind,
            base: a.base_version,
            rules: a.rules,
            by: { memberId: secretary.id, name: '비서' },
            scope: a.scope,
            taskId: a.task_id,
            reason: a.reason,
          });
          return text(r.ok ? `저장했습니다 (버전 ${r.version}).` : `저장하지 않았습니다: ${r.problems.join('; ')}`);
        },
      ),
      sdk.tool(
        'hire',
        'When no member fits the work, have 인사 design a new one. A temp (알바) joins for this work and leaves when it is done; a regular stays. To bring back a member who left, use the app action crew.hire instead.',
        { need: z.string().min(1).describe('The work no one fits'), temp: z.boolean() },
        async (a) => text(await chat.members.hire(sessionId, a.need, a.temp)),
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
          if (!to) return text(`${josa(a.to_role, '은')} 지금 고용되어 있지 않습니다.`);
          // The member who left is no longer hired, so it is looked up among everyone
          const from = chat.members.find(projectId(), a.from_role);
          if (!from) return text(`${josa(a.from_role, '은')} 크루에 없습니다.`);
          const task = chat.store.listTasks(sessionId).find((t) => t.id === a.task_id);
          if (!task) return text(`업무 ${josa(`#${a.task_id}`, '은')} 이 세션에 없습니다.`);
          const moved = chat.tasks.reassign(task, chat.crew.defOf(from).role, to);
          return text(
            moved.length
              ? `${moved.join(', ')} 단계를 ${a.to_role}에게 넘겼습니다.`
              : `${josa(a.from_role, '이')} 맡은 단계가 없습니다.`,
          );
        },
      ),
      sdk.tool(
        'reopen_task',
        'When the user asks to change the result of a finished task, or adds to a task still at work ("아 그리고 ..."), reopen that same task with what they want changed instead of starting a new one; a task at work takes it in without stopping. ' +
          'Leave task_id out when the user did not say which task ("그거 다시 해줘"): the app then asks the user with a card. A separate request is a new task.',
        {
          task_id: z.number().int().optional(),
          change: z.string().min(1).describe('What the user wants changed, in their words'),
        },
        async (a) => {
          const task = await pickTask(chat, sessionId, a.task_id, a.change);
          if (!task)
            return text(
              a.task_id ? `업무 ${josa(`#${a.task_id}`, '은')} 이 세션에 없습니다.` : '다시 열 업무가 없습니다.',
            );
          const ok = chat.tasks.reopen(task.id, a.change);
          return text(
            ok
              ? `업무 ${josa(`#${task.id}`, '을')} 다시 진행합니다.`
              : `업무 ${josa(`#${task.id}`, '은')} 지금 다시 열 수 없습니다 (${task.status}).`,
          );
        },
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
  const choice = await chat.questions.choose(sessionId, `"${change}" — 어느 업무를 다시 할까요?`, done.map(label));
  return done.find((t) => label(t) === choice) ?? null;
}
