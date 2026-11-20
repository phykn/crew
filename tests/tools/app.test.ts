import { expect, test, vi } from 'vitest';
import fs from 'node:fs';
import { OFF_CATALOG, appActions, appServer } from '../../src/backend/tools/app';
import { checkCall } from '../../src/backend/agents/guard';
import { never, openChat, reply, toolText, type Turn } from '../support';

test('비서 finds the stopped test task the user picks, opens its log, resumes only that one, and renames a member, all without another run', async () => {
  const navigated: unknown[] = [];
  const tool = (name: string, a: Record<string, unknown>) => toolText(fake, name, a);
  // The scripted model acts on what the tools answer, as a real one would
  const finds: Turn = async (p, o) => {
    const [t] = JSON.parse(
      await tool('app_read', { action: 'tasks.find', args: { query: '시험', status: 'stopped' } }),
    );
    await tool('app_act', { action: 'open.log', args: { task_id: t.id } });
    return reply(`업무 #${t.id}: ${t.stopReasons.join(' / ')}`, 's')(p, o);
  };
  const resumes: Turn = async (p, o) => {
    const done = await tool('app_act', { action: 'tasks.resume', args: { task_id: stopped[1].id } });
    const named = await tool('app_act', { action: 'crew.update', args: { role: '시험', nickname: '새별' } });
    return reply(`${done} ${named}`, 's')(p, o);
  };
  const { store, fake, chat, p, s, project } = openChat(
    { 비서: [finds, resumes], 시험: [never] },
    { emit: (ch, payload) => ch === 'navigate' && navigated.push(payload) },
  );
  const research = chat.workflows.shipped.find((w) => w.kind === 'research')!;
  const stopped = ['시험 A', '시험 B'].map((title, i) => {
    const t = store.createTask({
      sessionId: s.id,
      kind: 'research',
      title,
      request: '테스트',
      workflow: { ...research, steps: research.steps.map((x) => ({ ...x, role: 'tester' })) },
    });
    store.writeTaskStatus(t.id, 'stopped', '', `${title} 업무 중단됨: 사유 ${i + 1}`);
    return t;
  });

  const asking = chat.send(s.id, '지난번 테스트가 왜 멈췄는지 보여줘');
  await vi.waitFor(() => expect(store.listMessages(s.id).at(-1)!.question?.options).toHaveLength(2));
  chat.questions.answer(store.listMessages(s.id).at(-1)!.question!.id, `#${stopped[1].id} 시험 B (stopped)`);
  await asking;
  expect(store.listMessages(s.id).at(-1)!.text).toContain('사유 2');
  expect(navigated).toEqual([{ sessionId: s.id, view: 'log', taskId: stopped[1].id }]);
  expect(stopped.map((t) => store.readTask(t.id).status)).toEqual(['stopped', 'stopped']);

  await chat.send(s.id, '그거 이어서 하고, 시험 별명은 새별로 바꿔줘');
  expect(stopped.map((t) => store.readTask(t.id).status)).toEqual(['stopped', 'running']);
  expect(store.readMember(p.id, 'tester').nickname).toBe('새별');
  // The only other run is the resumed task's own step
  await vi.waitFor(() => expect(fake.calls.map((c) => c.role)).toEqual(['비서', '비서', '시험']));

  // Another project's task is not there for this session, and nothing opens
  const other = store.createSession(store.addProject(`${project}-other`).id);
  appServer(fake.sdk, chat, other.id);
  expect(await tool('app_act', { action: 'open.log', args: { task_id: stopped[0].id } })).toContain('없습니다');
  expect(navigated).toHaveLength(1);
  expect(await tool('app_act', { action: 'open.workflow', args: { kind: 'nope' } })).toContain('인자가 맞지 않습니다');
  // A read goes through app_read only, so a read-only grant cannot be used to act
  expect(await tool('app_act', { action: 'help', args: {} })).toContain('app_read');

  // With read access only, resuming is not 비서's to do
  const secretary = store.readMember(p.id, 'orchestrator');
  chat.members.setPermissions(secretary.id, { mcp: [{ server: 'app', access: 'read' }] });
  const policy = chat.runs.policy(store.readMemberById(secretary.id), p, `session-${s.id}`);
  expect(checkCall(policy, 'mcp__app__app_act', { action: 'tasks.resume' }).kind).not.toBe('allow');
  expect(checkCall(policy, 'mcp__app__app_read', { action: 'tasks.find' }).kind).toBe('allow');
});

test('a temp whose work is done leaves without a card, and a regular leaves or comes back only once allowed', async () => {
  const { store, fake, chat, p, s } = openChat();
  appServer(fake.sdk, chat, s.id);
  const definition = fs.readFileSync('crew/agents/researcher.md', 'utf-8').replace('role: 조사', 'role: 정리');
  const temp = store.addMember(p.id, { key: 'sorter', nickname: '알바', model: 'haiku', definition, temp: true });
  const hire = (role: string, hired: boolean) =>
    toolText(fake, 'app_act', { action: 'crew.hire', args: { role, hired } });
  const card = () => store.listMessages(s.id).at(-1)?.question;

  expect(await hire('정리', false)).toContain('퇴장');
  expect(store.readMemberById(temp.id).status).toBe('unhired');
  expect(card()).toBeUndefined();

  // 비서 cannot be let go, so that is refused without asking
  expect(await hire('비서', false)).toContain('내보낼 수 없습니다');
  expect(card()).toBeUndefined();

  // 시험 ends in a consonant, so the card shows whether its particle follows the role and not the bracket
  const tester = store.readMember(p.id, 'tester');
  for (const hired of [false, true]) {
    const asked = hire('시험', hired);
    await vi.waitFor(() => expect(card()?.answer).toBeNull());
    expect(card()!.prompt).toContain(hired ? '시험(시우)을 다시 고용할까요' : '시험(시우)을 내보낼까요');
    chat.questions.answer(card()!.id, '허용');
    await asked;
    expect(store.readMemberById(tester.id).status).toBe(hired ? 'hired' : 'unhired');
  }
});

test("the app's catalog covers every call the window makes, or says why not", () => {
  const { chat, s } = openChat();
  const covered = appActions(chat, s.id).flatMap((a) => a.ui);
  const ipc = fs.readFileSync('src/backend/window/ipc.ts', 'utf-8');
  const window = [...ipc.matchAll(/'([a-z]+\.[a-zA-Z]+)': handle\(/g)].map((m) => m[1]);
  expect(window.length).toBeGreaterThan(30);
  expect(window.filter((c) => !covered.includes(c) && !(c in OFF_CATALOG))).toEqual([]);
  expect(Object.keys(OFF_CATALOG).filter((c) => covered.includes(c) || !window.includes(c))).toEqual([]);
});

test('changing the approval mode waits for the user, and a refusal leaves it as it was', async () => {
  const { store, fake, chat, p, s } = openChat();
  appServer(fake.sdk, chat, s.id);
  const act = (mode: string) => toolText(fake, 'app_act', { action: 'mode.set', args: { mode } });
  const card = () => store.listMessages(s.id).at(-1)!.question!;

  const refused = act('bypass');
  await vi.waitFor(() => expect(card().prompt).toContain('전부로'));
  // Allowing is the last option, the card's main button, as on every card
  expect(card().options).toEqual(['거절', '허용']);
  chat.questions.answer(card().id, '거절');
  expect(await refused).toContain('거절');
  expect(store.readProject(p.id).mode).toBe('manual');

  const allowed = act('auto');
  await vi.waitFor(() => expect(card().answer).toBeNull());
  chat.questions.answer(card().id, '허용');
  expect(await allowed).toContain('자동으로');
  expect(store.readProject(p.id).mode).toBe('auto');
});

test('a wiki change of another project reads as missing, as does one that never was', async () => {
  const { store, fake, chat, s, project } = openChat();
  const q = store.addProject(`${project}-other`);
  chat.wiki.write(q.id, '비밀', 'TOP SECRET', { memberId: null, name: '사용자' });
  const [change] = chat.wiki.timeline(q.id);
  appServer(fake.sdk, chat, s.id);
  const read = (change_id: number) => toolText(fake, 'app_read', { action: 'wiki.timeline', args: { change_id } });
  expect(await read(change.id)).not.toContain('TOP SECRET');
  expect(await read(change.id)).toContain('없습니다');
  expect(await read(9999)).toContain('없습니다');
});
