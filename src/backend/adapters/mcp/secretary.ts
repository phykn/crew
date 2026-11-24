import { z } from 'zod';
import type { Sdk } from '../claude/agent';
import { text } from './text';
import { problemText } from '../../domain/workflow';
import type { Chat } from '../../app/chat';
import type { Task } from '../../domain/records';
import { wikiTools } from './wiki';

// The app's own tools for the interpreter in one session; a call is how it opens real work for the crew
export function secretaryTools(sdk: Sdk, chat: Chat, sessionId: number) {
  const projectId = () => chat.store.projectOf(sessionId).id;
  const secretary = chat.store.readMember(projectId(), 'interpreter');
  const kinds = chat.workflows.shipped.map((w) => w.kind) as [string, ...string[]];
  // Only a task of this conversation can be reached, whatever id is given
  const ownTask = (id: number) => chat.store.listTasks(sessionId).find((t) => t.id === id) ?? null;
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
          title: z
            .string()
            .min(1)
            .max(40)
            .describe("A few words in the user's language naming the task, shown on its card"),
          request: z.string().min(1).describe("The user's request in full, with any scope you settled with them"),
          original: z
            .string()
            .min(1)
            .describe(
              "The user's own words for this request, exactly as they wrote them, so the conductor can check your reading",
            ),
          role: z
            .string()
            .optional()
            .describe('Give the whole request to this one member instead: its key or its role as the window names it'),
          size: z
            .enum(['small', 'large'])
            .default('large')
            .describe(
              'For a code change: small when it stays within one or two files and needs no design choice, which skips the plan and its review',
            ),
        },
        async (a) => {
          const one = a.role ? memberOf(a.role) : null;
          if (a.role && !one) return text(`${a.role} is not hired now.`);
          const task = chat.tasks.start(
            sessionId,
            a.kind,
            a.title,
            `${a.request}

The user's own words:
${a.original}`,
            one ?? undefined,
            a.size === 'small',
          );
          return text(`Started task #${task.id} "${task.title}".`);
        },
      ),
      sdk.tool(
        'ask_member',
        'Ask a member about its work, such as what it is doing now, what it found, or why it chose something, without disturbing it: a copy of its session answers and its work goes on untouched. Words meant to change the work go to reopen_task instead.',
        {
          role: z.string().describe("The member's key or its role as the window names it"),
          question: z.string().min(1).describe("The user's question in their words"),
        },
        async (a) => {
          const member = memberOf(a.role);
          if (!member) return text(`${a.role} is not hired now.`);
          const role = chat.crew.defOf(member).role;
          const out = await chat.runs.ask(member, sessionId, a.question);
          if (!out) return text(`${role} has not worked in this session yet, so there is no conversation to ask.`);
          return text(out.status === 'done' ? out.text : `${role} could not answer: ${out.error ?? out.status}`);
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
        'Save changed rules for a task kind, based on the version you read. scope: future (from now on: new tasks), current (this task too: also the remaining steps of task_id), once (only this time: task_id only, not saved for later).',
        {
          kind: z.enum(kinds),
          base_version: z.number().int(),
          rules: z.record(z.string(), z.unknown()),
          scope: z.enum(['future', 'current', 'once']),
          task_id: z.number().int().optional(),
          reason: z.string().optional().describe("Why, in the user's language; kept with the new version"),
        },
        async (a) => {
          if (a.task_id && !ownTask(a.task_id)) return text(`Not saved: this conversation has no task #${a.task_id}.`);
          const r = chat.workflows.save({
            projectId: projectId(),
            kind: a.kind,
            base: a.base_version,
            rules: a.rules,
            by: { name: 'interpreter' },
            scope: a.scope,
            taskId: a.task_id,
            reason: a.reason,
          });
          return text(r.ok ? `Saved as version ${r.version}.` : `Not saved: ${r.problems.map(problemText).join('; ')}`);
        },
      ),
      sdk.tool(
        'reassign',
        "Give a task's steps from a member who left to another before reopening or resuming it. The new member gets the saved handback.",
        {
          task_id: z.number().int(),
          from_role: z.string().describe('Key or role as the window names it'),
          to_role: z.string().describe('Key or role as the window names it'),
        },
        async (a) => {
          const to = memberOf(a.to_role);
          if (!to) return text(`${a.to_role} is not hired now.`);
          // The member who left is no longer hired, so it is looked up among everyone
          const from = chat.members.find(projectId(), a.from_role);
          if (!from) return text(`${a.from_role} is not in the crew.`);
          const task = ownTask(a.task_id);
          if (!task) return text(`This session has no task #${a.task_id}.`);
          const moved = chat.tasks.reassign(task, chat.crew.defOf(from).role, to);
          return text(
            moved.length ? `Handed ${moved.join(', ')} to ${a.to_role}.` : `${a.from_role} holds no step of this task.`,
          );
        },
      ),
      sdk.tool(
        'reopen_task',
        'When the user asks to change the result of a finished task, or adds to a task still at work ("and also ..."), reopen that same task with what they want changed instead of starting a new one; a task at work takes it in without stopping. ' +
          'Leave task_id out when the user did not say which task ("redo that"): the app then asks the user with a card. A separate request is a new task.',
        {
          task_id: z.number().int().optional(),
          change: z.string().min(1).describe('What the user wants changed, in their words'),
        },
        async (a) => {
          const task = await pickTask(chat, sessionId, a.task_id, a.change);
          if (!task) return text(a.task_id ? `This session has no task #${a.task_id}.` : 'There is no task to reopen.');
          const ok = chat.tasks.reopen(task.id, a.change);
          return text(
            ok ? `Task #${task.id} is going again.` : `Task #${task.id} cannot be reopened now (${task.status}).`,
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
  const choice = await chat.questions.choose(sessionId, { code: 'card.redo', change }, done.map(label));
  return done.find((t) => label(t) === choice) ?? null;
}
