import { z } from 'zod';
import type { Sdk } from '../claude/agent';
import { text } from './text';
import type { Chat } from '../../app/chat';
import type { Task } from '../../domain/records';
import { KEPT } from '../../domain/crew';
import { ALLOW, REFUSE } from '../../domain/answers';
import { MODELS, MODES, type Say } from '../../../shared';
import appHelp from './help/app.md?raw';
import crewHelp from './help/crew.md?raw';
import tasksHelp from './help/tasks.md?raw';
import workflowHelp from './help/workflow.md?raw';

type Action = {
  id: string;
  // What it does, for the interpreter to find
  label: string;
  // read changes nothing; act changes the record or the window
  kind: 'read' | 'act';
  args: z.ZodObject;
  // The window calls this action does, so a new call in the window shows up as missing here
  ui: string[];
  // Set for what changes who may do what or deletes something: the user approves it on a card first, unless it returns null
  confirm?: (a: never) => Say | null;
  run: (a: never) => unknown;
};
const action = <S extends z.ZodObject>(
  a: Omit<Action, 'args' | 'run' | 'confirm'> & {
    args: S;
    confirm?: (a: z.infer<S>) => Say | null;
    run: (a: z.infer<S>) => unknown;
  },
) => a as unknown as Action;

// The log lines that say why a task stopped
const STOPS = ['task.fail', 'task.stopped', 'task.limit', 'task.restarted', 'step.failed'];

// Window calls the interpreter does not get, each with why
export const OFF_CATALOG: Record<string, string> = {
  'window.notify': 'window state, not an action',
  'projects.list': 'the interpreter sees only its own project',
  'projects.open': 'opening a folder needs the native dialog',
  'projects.impact': 'removing the project the crew works in is for the user',
  'projects.remove': 'removing the project the crew works in is for the user',
  'sessions.create': 'a fresh session is the user’s to start, with /clear or New session',
  'last.read': 'window state, not an action',
  'tasks.versions': 'feeds the file links under a report; the interpreter reads a task’s files from its log',
  'last.write': 'window state, not an action',
  'lang.read': 'window state, not an action',
  'lang.write': 'the window’s language is the user’s to pick in the title bar',
  'messages.list': 'the interpreter is the conversation itself',
  'messages.busy': 'the interpreter is the conversation itself',
  'messages.send': 'the interpreter is the conversation itself',
  'messages.stop': 'the interpreter is the conversation itself',
  'members.reset': 'a reset also drops permission changes, which only the user makes in the window',
  'members.setPermissions': 'only the user changes permissions, skills, and MCP servers, in the window',
  'questions.answer': 'only the user answers cards',
  'camp.state': 'the camp is drawn from the record, not acted on',
  'workflows.save': 'the interpreter saves workflows with change_workflow, filing the reason',
  'connections.list': 'keys and logins are the user’s to manage in the Connect tab',
  'connections.saveKey': 'keys and logins are the user’s to manage in the Connect tab',
  'connections.removeKey': 'keys and logins are the user’s to manage in the Connect tab',
  'connections.check': 'keys and logins are the user’s to manage in the Connect tab',
  'crew.names': 'the window hands over the names it shows when it starts; there is nothing to change by talk',
  'connections.use': 'which service the crew runs on, and so what it costs, is the user’s to pick in the Connect tab',
  'changes.file': 'a diff opens from a file the user clicks in the log; the interpreter reads files itself',
};

// Every action the user can take in the window, within this session's project
export function appActions(chat: Chat, sessionId: number): Action[] {
  const { store, crew, members, wiki } = chat;
  const projectId = store.projectOf(sessionId).id;
  const task_id = z.number().int();
  const role = z.string().describe('A member: its key or its role as the window names it');
  // Only this project's tasks and sessions exist for the caller; any other id is answered as missing
  const ownTask = (id: number) => {
    try {
      const task = store.readTask(id);
      return store.readSession(task.sessionId).projectId === projectId ? task : null;
    } catch {
      return null;
    }
  };
  const ownSession = (id: number) => {
    if (!store.listSessions(projectId).some((s) => s.id === id)) throw new Error(`This project has no session #${id}.`);
  };
  // Checked before the card too, so the user is never asked about a session that cannot go
  const deletable = (id: number) => {
    ownSession(id);
    if (id === sessionId) throw new Error('The session this conversation is in cannot be deleted.');
  };
  const member = (name: string) => {
    const m = members.find(projectId, name);
    if (!m) throw new Error(`${name} is not in this project's crew.`);
    return m;
  };
  const task = (id: number) => {
    const t = ownTask(id);
    if (!t) throw new Error(`This project has no task #${id}.`);
    return t;
  };
  const describe = (t: Task) => {
    const stop = store
      .listEvents(t.sessionId)
      .filter((e) => e.taskId === t.id && STOPS.includes(e.say?.code ?? ''))
      .map((e) => e.say);
    return { id: t.id, title: t.title, status: t.status, stage: t.stage, updatedAt: t.updatedAt, stopReasons: stop };
  };
  const go = (view: Record<string, unknown>) => chat.emit('navigate', { sessionId, ...view });
  const kinds = chat.workflows.shipped.map((w) => w.kind) as [string, ...string[]];
  const actions: Action[] = [
    action({
      id: 'help',
      label: 'Read the help',
      kind: 'read',
      args: z.object({}),
      ui: [],
      run: () => [appHelp, crewHelp, tasksHelp, workflowHelp].join('\n\n'),
    }),
    action({
      id: 'tasks.find',
      label: 'Find a task',
      kind: 'read',
      args: z.object({
        query: z.string().default(''),
        status: z.enum(['stopped', 'failed', 'done', 'running']).optional(),
      }),
      ui: ['tasks.list'],
      // When several fit, the user picks one on a card and only that one is returned
      run: async (a) => {
        const words = a.query.split(/\s+/).filter(Boolean);
        const all = store
          .listSessions(projectId)
          .flatMap((s) => store.listTasks(s.id))
          .filter((t) => !a.status || t.status === a.status)
          .filter((t) => words.every((w) => `${t.title} ${t.request}`.includes(w)))
          .sort((x, y) => y.id - x.id);
        if (all.length <= 1) return all.map(describe);
        const label = (t: Task) => `#${t.id} ${t.title} (${t.status})`;
        const choice = await chat.questions.choose(sessionId, { code: 'card.whichTask' }, all.map(label));
        return [describe(all.find((t) => label(t) === choice)!)];
      },
    }),
    action({
      id: 'tasks.log',
      label: 'Read a task log',
      kind: 'read',
      args: z.object({ task_id }),
      ui: ['events.list'],
      run: (a) => {
        const t = task(a.task_id);
        return store
          .listEvents(t.sessionId)
          .filter((e) => e.taskId === t.id)
          .map((e) => ({ at: e.at, kind: e.kind, ...e.say }));
      },
    }),
    action({
      id: 'usage',
      label: 'Read usage',
      kind: 'read',
      args: z.object({}),
      ui: ['usage.list'],
      run: () => chat.runs.spend(sessionId),
    }),
    action({
      id: 'sessions.list',
      label: 'List sessions',
      kind: 'read',
      args: z.object({}),
      ui: ['sessions.list', 'tree.list'],
      run: () => store.listSessions(projectId),
    }),
    action({
      id: 'crew.list',
      label: 'List the crew',
      kind: 'read',
      args: z.object({}),
      ui: ['members.list'],
      run: () =>
        crew
          .describe(store.listMembers(projectId))
          .map((m) => ({ key: m.key, role: m.role, nickname: m.nickname, model: m.model, status: m.status })),
    }),
    action({
      id: 'crew.permissions',
      label: 'Read a member’s permissions and definition',
      kind: 'read',
      args: z.object({ role }),
      ui: ['members.permissions', 'members.definition'],
      run: (a) => {
        const m = member(a.role);
        const def = crew.defOf(m);
        return {
          settings: members.settings(m),
          changes: store.listPermissionChanges(m.id),
          description: def.description,
        };
      },
    }),
    action({
      id: 'mode.read',
      label: 'Read the approval mode',
      kind: 'read',
      args: z.object({}),
      ui: [],
      run: () => store.projectOf(sessionId).mode,
    }),
    action({
      id: 'wiki.list',
      label: 'Read the wiki documents',
      kind: 'read',
      args: z.object({}),
      ui: ['wiki.list', 'wiki.graph'],
      run: () => wiki.list(projectId),
    }),
    action({
      id: 'wiki.timeline',
      label: 'Read the wiki change history',
      kind: 'read',
      args: z.object({}),
      ui: ['wiki.timeline'],
      run: () => wiki.timeline(projectId),
    }),
    action({
      id: 'memories',
      label: 'Read a member’s memory',
      kind: 'read',
      args: z.object({ role: role.optional() }),
      ui: ['memories.list'],
      run: (a) => wiki.memories(projectId, a.role ? member(a.role).id : undefined),
    }),
    action({
      id: 'workflows.read',
      label: 'Read a workflow',
      kind: 'read',
      args: z.object({ kind: z.enum(kinds).optional() }),
      ui: ['workflows.kinds', 'workflows.read'],
      run: (a) =>
        a.kind
          ? chat.workflows.current(projectId, a.kind)
          : chat.workflows.shipped.map((w) => ({ kind: w.kind, label: w.label })),
    }),
    action({
      id: 'open.log',
      label: 'Open the log',
      kind: 'act',
      args: z.object({ task_id: task_id.optional() }),
      ui: [],
      run: (a) => {
        const t = a.task_id === undefined ? null : task(a.task_id);
        go({ view: 'log', taskId: t?.id ?? null });
        return t ? `Opened the log of task #${t.id}.` : 'Opened the log.';
      },
    }),
    action({
      id: 'open.wiki',
      label: 'Open the wiki change timeline',
      kind: 'act',
      args: z.object({}),
      ui: [],
      run: () => {
        go({ view: 'wiki' });
        return 'Opened the wiki change timeline.';
      },
    }),
    action({
      id: 'open.workflow',
      label: 'Open the workflow editor',
      kind: 'act',
      args: z.object({ kind: z.enum(kinds).default('code') }),
      ui: [],
      run: (a) => {
        go({ view: 'workflow', kind: a.kind });
        return `Opened the ${a.kind} workflow editor.`;
      },
    }),
    action({
      id: 'tasks.stop',
      label: 'Stop a task',
      kind: 'act',
      args: z.object({ task_id }),
      ui: ['tasks.stop'],
      run: (a) => {
        const t = task(a.task_id);
        return chat.tasks.stop(t.id)
          ? `Stopping task #${t.id}.`
          : `Task #${t.id} is ${t.status} and cannot be stopped.`;
      },
    }),
    action({
      id: 'tasks.resume',
      label: 'Resume a task',
      kind: 'act',
      args: z.object({ task_id }),
      ui: ['tasks.resume'],
      run: (a) => {
        const t = task(a.task_id);
        return chat.tasks.resume(t.id)
          ? `Resumed task #${t.id}.`
          : `Task #${t.id} is ${t.status} and cannot be resumed.`;
      },
    }),
    action({
      id: 'sessions.rename',
      label: 'Rename a session',
      kind: 'act',
      args: z.object({ session_id: z.number().int(), title: z.string().trim().min(1).max(30) }),
      ui: [],
      run: (a) => {
        ownSession(a.session_id);
        chat.renameSession(a.session_id, a.title);
        return `Renamed the session: ${a.title}`;
      },
    }),
    action({
      id: 'sessions.delete',
      label: 'Delete a session',
      kind: 'act',
      args: z.object({ session_id: z.number().int() }),
      ui: ['sessions.delete', 'sessions.impact'],
      confirm: (a) => {
        deletable(a.session_id);
        const n = store.impact({ sessionId: a.session_id });
        return { code: 'confirm.deleteSession', session: a.session_id, tasks: n.tasks, events: n.events };
      },
      run: (a) => {
        deletable(a.session_id);
        chat.deleteSession(a.session_id);
        return `Deleted session #${a.session_id}.`;
      },
    }),
    action({
      id: 'crew.update',
      label: 'Change a member’s nickname or model',
      kind: 'act',
      args: z.object({ role, nickname: z.string().trim().min(1).max(12).optional(), model: z.enum(MODELS).optional() }),
      ui: ['members.update'],
      run: (a) => {
        const m = member(a.role);
        members.update(m.id, { nickname: a.nickname, model: a.model });
        return `${a.role}: ${[a.nickname && `nickname ${a.nickname}`, a.model && `model ${a.model}`].filter(Boolean).join(', ') || 'nothing changed'}`;
      },
    }),
    action({
      id: 'crew.hire',
      label: 'Hire or let go a member',
      kind: 'act',
      args: z.object({ role, hired: z.boolean() }),
      ui: ['members.update'],
      // A temp whose work is done is meant to leave, and a kept member is refused, so neither is asked
      confirm: (a) => {
        const m = member(a.role);
        if (!a.hired && (m.temp || KEPT.includes(m.key))) return null;
        return { code: 'confirm.hire', role: m.key, nickname: crew.nicknameOf(m), hired: a.hired };
      },
      run: (a) => {
        const m = member(a.role);
        members.update(m.id, { status: a.hired ? 'hired' : 'unhired' });
        return `${m.key} is ${a.hired ? 'hired' : 'let go'}.`;
      },
    }),
    action({
      id: 'mode.set',
      label: 'Change the approval mode',
      kind: 'act',
      args: z.object({ mode: z.enum(MODES) }),
      ui: ['projects.setMode'],
      confirm: (a) => ({ code: 'confirm.mode', mode: a.mode }),
      run: (a) => {
        chat.setMode(projectId, a.mode);
        return `The approval mode is now ${a.mode}.`;
      },
    }),
  ];
  return actions;
}

// The app's own MCP server, in process: the actions above, each done the way the matching click would
export function appServer(sdk: Sdk, chat: Chat, sessionId: number) {
  const { store } = chat;
  const actions = appActions(chat, sessionId);
  const byId = new Map(actions.map((a) => [a.id, a]));

  async function perform(id: string, args: unknown, kind: Action['kind']) {
    const a = byId.get(id);
    if (!a) return text(`No such action: ${id}. Find it with app_find_actions.`);
    if (a.kind !== kind) return text(`${id} is done with ${a.kind === 'read' ? 'app_read' : 'app_act'}.`);
    const parsed = a.args.safeParse(args ?? {});
    if (!parsed.success) return text(`Wrong arguments: ${parsed.error.message}`);
    try {
      // bypass checks nothing; otherwise who may do what, and deleting, is the user's call
      const prompt = store.projectOf(sessionId).mode === 'bypass' ? null : a.confirm?.(parsed.data as never);
      if (prompt) {
        // The last option is the card's main button, as on every other card
        const answer = await chat.questions.choose(sessionId, prompt, [REFUSE, ALLOW]);
        if (answer !== ALLOW) return text('The user refused, so it was not done.');
      }
      const out = await a.run(parsed.data as never);
      return text(typeof out === 'string' ? out : JSON.stringify(out));
    } catch (err) {
      return text(err instanceof Error ? err.message : String(err));
    }
  }

  return sdk.createSdkMcpServer({
    name: 'app',
    tools: [
      sdk.tool(
        'app_find_actions',
        'List what can be done in the crew app, optionally only actions whose id or label has these words. Each comes with its kind (read: app_read, act: app_act), its arguments as JSON Schema, and whether the user approves it on a card first.',
        { query: z.string().default('') },
        async (q) => {
          const words = q.query.split(/\s+/).filter(Boolean);
          const found = actions
            .filter((a) => words.every((w) => `${a.id} ${a.label}`.includes(w)))
            .map((a) => ({
              id: a.id,
              label: a.label,
              kind: a.kind,
              args: z.toJSONSchema(a.args),
              asksUser: !!a.confirm,
            }));
          return text(JSON.stringify(found));
        },
      ),
      sdk.tool(
        'app_read',
        'Do a read action from app_find_actions; it changes nothing.',
        { action: z.string(), args: z.record(z.string(), z.unknown()).default({}) },
        (q) => perform(q.action, q.args, 'read'),
      ),
      sdk.tool(
        'app_act',
        'Do an act action from app_find_actions: open a screen or change something, the way the matching click would.',
        { action: z.string(), args: z.record(z.string(), z.unknown()).default({}) },
        (q) => perform(q.action, q.args, 'act'),
      ),
    ],
  });
}
