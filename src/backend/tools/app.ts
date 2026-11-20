import { z } from 'zod';
import { type Sdk, text } from '../agents/run';
import type { Chat } from '../chat';
import type { Member, Task } from '../db';
import { KEPT } from '../crew/shipped';
import { ALLOW, REFUSE } from '../questions';
import { josa, particle } from '../../korean';
import { MODE_LABELS, MODELS, MODES } from '../../shared';

type Action = {
  id: string;
  // What the user would call it, in Korean
  label: string;
  // read changes nothing; act changes the record or the window
  kind: 'read' | 'act';
  args: z.ZodObject;
  // The window calls this action does, so a new call in the window shows up as missing here
  ui: string[];
  // Set for what changes who may do what or deletes something: the user approves it on a card first, unless it returns null
  confirm?: (a: never) => string | null;
  run: (a: never) => unknown;
};
const action = <S extends z.ZodObject>(
  a: Omit<Action, 'args' | 'run' | 'confirm'> & {
    args: S;
    confirm?: (a: z.infer<S>) => string | null;
    run: (a: z.infer<S>) => unknown;
  },
) => a as unknown as Action;

// Window calls 비서 does not get, each with why
export const OFF_CATALOG: Record<string, string> = {
  'projects.list': '비서 sees only its own project',
  'projects.open': 'opening a folder needs the native dialog',
  'projects.impact': 'removing the project the crew works in is for the user',
  'projects.remove': 'removing the project the crew works in is for the user',
  'sessions.create': 'a fresh session is the user’s to start, with /clear or 새 세션',
  'last.read': 'window state, not an action',
  'last.write': 'window state, not an action',
  'messages.list': '비서 is the conversation itself',
  'messages.busy': '비서 is the conversation itself',
  'messages.send': '비서 is the conversation itself',
  'messages.stop': '비서 is the conversation itself',
  'members.reset': 'a reset also drops permission changes, which are the tools member’s to make',
  'members.setPermissions': 'the tools member changes permissions, skills, and MCP servers, through ask_tools',
  'questions.answer': 'only the user answers cards',
  'camp.state': 'the camp is drawn from the record, not acted on',
  'workflows.save': '비서 saves workflows with change_workflow, filing the reason',
  'changes.file': 'a diff opens from a file the user clicks in the log; 비서 reads files itself',
};

// Every action the user can take in the window, within this session's project
export function appActions(chat: Chat, sessionId: number): Action[] {
  const { store, crew, members, wiki } = chat;
  const projectId = store.projectOf(sessionId).id;
  const task_id = z.number().int();
  const role = z.string().describe('A member: its key or Korean role');
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
    if (!store.listSessions(projectId).some((s) => s.id === id))
      throw new Error(`세션 ${josa(`#${id}`, '은')} 이 프로젝트에 없습니다.`);
  };
  // Checked before the card too, so the user is never asked about a session that cannot go
  const deletable = (id: number) => {
    ownSession(id);
    if (id === sessionId) throw new Error('지금 대화 중인 세션은 지울 수 없습니다.');
  };
  const doc = (title: string) => {
    const d = wiki.find(projectId, title);
    if (!d) throw new Error(`위키에 "${title}" 문서가 없습니다.`);
    return d;
  };
  const member = (name: string) => {
    const m = members.find(projectId, name);
    if (!m) throw new Error(`${josa(name, '은')} 이 프로젝트 크루에 없습니다.`);
    return m;
  };
  // The particle follows the role, since the bracket after it hides the word's last sound from josa
  const named = (m: Member, kind?: Parameters<typeof particle>[1]) =>
    `${crew.defOf(m).role}(${m.nickname})${kind ? particle(crew.defOf(m).role, kind) : ''}`;
  const task = (id: number) => {
    const t = ownTask(id);
    if (!t) throw new Error(`업무 ${josa(`#${id}`, '은')} 이 프로젝트에 없습니다.`);
    return t;
  };
  const describe = (t: Task) => {
    const stop = store
      .listEvents(t.sessionId)
      .filter((e) => e.taskId === t.id && /실패|중단|멈/.test(e.text))
      .map((e) => e.text);
    return { id: t.id, title: t.title, status: t.status, stage: t.stage, updatedAt: t.updatedAt, stopReasons: stop };
  };
  const go = (view: Record<string, unknown>) => chat.emit('navigate', { sessionId, ...view });
  const kinds = chat.workflows.shipped.map((w) => w.kind) as [string, ...string[]];
  const secretary = { memberId: members.find(projectId, 'orchestrator')?.id ?? null, name: '비서' };

  const actions: Action[] = [
    action({
      id: 'help',
      label: '도움말 읽기',
      kind: 'read',
      args: z.object({}),
      ui: [],
      run: () => crew.help(),
    }),
    action({
      id: 'tasks.find',
      label: '업무 찾기',
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
        const choice = await chat.questions.choose(sessionId, '어느 업무를 말씀하시나요?', all.map(label));
        return [describe(all.find((t) => label(t) === choice)!)];
      },
    }),
    action({
      id: 'tasks.log',
      label: '업무 기록 읽기',
      kind: 'read',
      args: z.object({ task_id }),
      ui: ['events.list'],
      run: (a) => {
        const t = task(a.task_id);
        return store
          .listEvents(t.sessionId)
          .filter((e) => e.taskId === t.id)
          .map((e) => ({ at: e.at, kind: e.kind, text: e.text }));
      },
    }),
    action({
      id: 'usage',
      label: '사용량 보기',
      kind: 'read',
      args: z.object({}),
      ui: ['usage.list'],
      run: () => store.usage(sessionId).map((u) => ({ ...u, role: crew.defOf(store.readMemberById(u.memberId)).role })),
    }),
    action({
      id: 'sessions.list',
      label: '세션 목록 보기',
      kind: 'read',
      args: z.object({}),
      ui: ['sessions.list', 'tree.list'],
      run: () => store.listSessions(projectId),
    }),
    action({
      id: 'crew.list',
      label: '크루 목록 보기',
      kind: 'read',
      args: z.object({}),
      ui: ['members.list'],
      run: () =>
        crew
          .describe(store.listMembers(projectId), members.kit(projectId))
          .map((m) => ({ key: m.key, role: m.role, nickname: m.nickname, model: m.model, status: m.status })),
    }),
    action({
      id: 'crew.permissions',
      label: '담당자 권한과 정의 보기',
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
      label: '승인 모드 보기',
      kind: 'read',
      args: z.object({}),
      ui: [],
      run: () => store.projectOf(sessionId).mode,
    }),
    action({
      id: 'wiki.list',
      label: '위키 문서 보기',
      kind: 'read',
      args: z.object({}),
      ui: ['wiki.list', 'wiki.graph'],
      run: () => wiki.list(projectId),
    }),
    action({
      id: 'wiki.timeline',
      label: '위키 변경 기록 보기',
      kind: 'read',
      args: z.object({
        change_id: z.number().int().optional().describe('One change, to read what it added and removed'),
      }),
      ui: ['wiki.timeline', 'wiki.change'],
      run: (a) => (a.change_id ? wiki.change(a.change_id, projectId) : wiki.timeline(projectId)),
    }),
    action({
      id: 'memories',
      label: '담당자 기억 보기',
      kind: 'read',
      args: z.object({ role: role.optional() }),
      ui: ['memories.list'],
      run: (a) => wiki.memories(projectId, a.role ? member(a.role).id : undefined),
    }),
    action({
      id: 'workflows.read',
      label: '워크플로우 보기',
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
      label: '로그 열기',
      kind: 'act',
      args: z.object({ task_id: task_id.optional() }),
      ui: [],
      run: (a) => {
        const t = a.task_id === undefined ? null : task(a.task_id);
        go({ view: 'log', taskId: t?.id ?? null });
        return t ? `업무 #${t.id}의 로그를 열었습니다.` : '로그를 열었습니다.';
      },
    }),
    action({
      id: 'open.wiki',
      label: '위키 변경 기록 열기',
      kind: 'act',
      args: z.object({}),
      ui: [],
      run: () => {
        go({ view: 'wiki' });
        return '위키 변경 타임라인을 열었습니다.';
      },
    }),
    action({
      id: 'open.workflow',
      label: '워크플로우 편집기 열기',
      kind: 'act',
      args: z.object({ kind: z.enum(kinds).default('code') }),
      ui: [],
      run: (a) => {
        go({ view: 'workflow', kind: a.kind });
        return `${a.kind} 워크플로우 편집 화면을 열었습니다.`;
      },
    }),
    action({
      id: 'tasks.stop',
      label: '업무 중단',
      kind: 'act',
      args: z.object({ task_id }),
      ui: ['tasks.stop'],
      run: (a) => {
        const t = task(a.task_id);
        return chat.tasks.stop(t.id)
          ? `업무 ${josa(`#${t.id}`, '을')} 중단합니다.`
          : `업무 ${josa(`#${t.id}`, '은')} ${t.status} 상태라 중단할 수 없습니다.`;
      },
    }),
    action({
      id: 'tasks.resume',
      label: '업무 재개',
      kind: 'act',
      args: z.object({ task_id }),
      ui: ['tasks.resume'],
      run: (a) => {
        const t = task(a.task_id);
        return chat.tasks.resume(t.id)
          ? `업무 ${josa(`#${t.id}`, '을')} 재개했습니다.`
          : `업무 ${josa(`#${t.id}`, '은')} ${t.status} 상태라 재개할 수 없습니다.`;
      },
    }),
    action({
      id: 'sessions.rename',
      label: '세션 이름 바꾸기',
      kind: 'act',
      args: z.object({ session_id: z.number().int(), title: z.string().trim().min(1).max(30) }),
      ui: [],
      run: (a) => {
        ownSession(a.session_id);
        chat.renameSession(a.session_id, a.title);
        return `세션 이름을 바꿨습니다: ${a.title}`;
      },
    }),
    action({
      id: 'sessions.delete',
      label: '세션 삭제',
      kind: 'act',
      args: z.object({ session_id: z.number().int() }),
      ui: ['sessions.delete', 'sessions.impact'],
      confirm: (a) => {
        deletable(a.session_id);
        const n = store.impact({ sessionId: a.session_id });
        return `세션 ${josa(`#${a.session_id}`, '을')} 지울까요? 업무 ${n.tasks}개와 기록 ${n.events}줄이 함께 지워집니다.`;
      },
      run: (a) => {
        deletable(a.session_id);
        chat.deleteSession(a.session_id);
        return `세션 ${josa(`#${a.session_id}`, '을')} 지웠습니다.`;
      },
    }),
    action({
      id: 'crew.update',
      label: '담당자 별명과 모델 바꾸기',
      kind: 'act',
      args: z.object({ role, nickname: z.string().trim().min(1).max(12).optional(), model: z.enum(MODELS).optional() }),
      ui: ['members.update'],
      run: (a) => {
        const m = member(a.role);
        members.update(m.id, { nickname: a.nickname, model: a.model });
        return `${a.role}: ${[a.nickname && `별명 ${a.nickname}`, a.model && `모델 ${a.model}`].filter(Boolean).join(', ') || '바뀐 것 없음'}`;
      },
    }),
    action({
      id: 'crew.hire',
      label: '담당자 고용과 내보내기',
      kind: 'act',
      args: z.object({ role, hired: z.boolean() }),
      ui: ['members.update'],
      // A temp whose work is done is meant to leave, and a kept member is refused, so neither is asked
      confirm: (a) => {
        const m = member(a.role);
        if (!a.hired && (m.temp || KEPT.includes(m.key))) return null;
        return `${named(m, '을')} ${a.hired ? '다시 고용할까요?' : '내보낼까요?'}`;
      },
      run: (a) => {
        const m = member(a.role);
        members.update(m.id, { status: a.hired ? 'hired' : 'unhired' });
        return `${named(m)} ${a.hired ? '고용' : '퇴장'} 처리했습니다.`;
      },
    }),
    action({
      id: 'mode.set',
      label: '승인 모드 바꾸기',
      kind: 'act',
      args: z.object({ mode: z.enum(MODES) }),
      ui: ['projects.setMode'],
      confirm: (a) => `승인 모드를 ${josa(MODE_LABELS[a.mode], '으로')} 바꿀까요?`,
      run: (a) => {
        chat.setMode(projectId, a.mode);
        return `승인 모드를 ${josa(MODE_LABELS[a.mode], '으로')} 바꿨습니다.`;
      },
    }),
    action({
      id: 'wiki.write',
      label: '위키 문서 쓰기',
      kind: 'act',
      args: z.object({ title: z.string().trim().min(1).max(60), body: z.string() }),
      ui: ['wiki.write'],
      run: (a) => {
        wiki.write(projectId, a.title, a.body, secretary);
        chat.emit('changed', { topic: 'wiki' });
        return `위키 문서를 저장했습니다: ${a.title}`;
      },
    }),
    action({
      id: 'wiki.remove',
      label: '위키 문서 지우기',
      kind: 'act',
      args: z.object({ title: z.string(), release_rule: z.boolean().default(false) }),
      ui: ['wiki.remove'],
      confirm: (a) => {
        doc(a.title);
        return `위키 문서를 지울까요? ${a.title}.${a.release_rule ? ' 이 문서가 만든 규칙도 함께 풉니다.' : ''}`;
      },
      run: (a) => chat.workflows.removeDoc(doc(a.title).id, a.release_rule, secretary),
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
    if (!a) return text(`없는 동작입니다: ${id}. app_find_actions로 찾으세요.`);
    if (a.kind !== kind) return text(`${id}: ${a.kind === 'read' ? 'app_read' : 'app_act'}로 하는 동작입니다.`);
    const parsed = a.args.safeParse(args ?? {});
    if (!parsed.success) return text(`인자가 맞지 않습니다: ${parsed.error.message}`);
    try {
      // 전부 checks nothing; otherwise who may do what, and deleting, is the user's call
      const prompt = store.projectOf(sessionId).mode === 'bypass' ? null : a.confirm?.(parsed.data as never);
      if (prompt) {
        // The last option is the card's main button, as on every other card
        const answer = await chat.questions.choose(sessionId, prompt, [REFUSE, ALLOW]);
        if (answer !== ALLOW) return text('사용자가 거절해서 하지 않았습니다.');
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
        'List what can be done in the crew app, optionally only actions whose id or Korean label has these words. Each comes with its kind (read: app_read, act: app_act), its arguments as JSON Schema, and whether the user approves it on a card first.',
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
