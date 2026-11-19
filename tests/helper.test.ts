import { expect, test, vi } from 'vitest';
import { Chat } from '../src/main/chat';
import { appServer } from '../src/main/app-mcp';
import { checkCall } from '../src/main/guard';
import { CREW, fakeCrew, openScratch, reply, type Turn } from './support';

type Result = { content: { text: string }[] };

test('도우미 finds the stopped test task the user picks, opens its log, and resumes only that one', async () => {
  const { store, project, paths } = openScratch();
  const navigated: unknown[] = [];
  let fake: ReturnType<typeof fakeCrew>;
  const tool = async (name: string, a: Record<string, unknown>) => ((await fake.tools.get(name)!(a)) as Result).content[0].text;
  // The scripted models act on what the tools answer, as real ones would
  const helperFinds: Turn = async (p, o) => {
    const [t] = JSON.parse(await tool('find_tasks', { query: '시험', status: 'stopped' }));
    await tool('open_log', { task_id: t.id });
    return reply(`업무 #${t.id}: ${t.stopReasons.join(' / ')}`, 'h')(p, o);
  };
  const helperResumes: Turn = async (p, o) => reply(await tool('resume_task', { task_id: Number(p.match(/#(\d+)/)![1]) }), 'h')(p, o);
  const relay = (request: string): Turn => async (p, o) => reply(await tool('ask_helper', { request }), 's')(p, o);
  const never: Turn = () => new Promise(() => {});
  fake = fakeCrew({ 비서: [relay('지난번 테스트가 왜 멈췄는지 보여줘'), relay('')], 도우미: [helperFinds, helperResumes], 시험: [never] });
  const chat = new Chat(store, async () => fake.sdk, CREW, (ch, p) => ch === 'navigate' && navigated.push(p), paths);
  const p = store.addProject(project);
  chat.seed(p.id);
  const s = store.createSession(p.id);
  const research = chat.workflows.find((w) => w.kind === 'research')!;
  const stopped = ['시험 A', '시험 B'].map((title, i) => {
    const t = store.createTask({ sessionId: s.id, kind: 'research', title, request: '테스트', workflow: { ...research, steps: research.steps.map((x) => ({ ...x, role: 'tester' })) } });
    store.writeTaskStatus(t.id, 'stopped', '', `업무 "${title}" 중단됨: 사유 ${i + 1}`);
    return t;
  });

  const asking = chat.send(s.id, '지난번 테스트가 왜 멈췄는지 보여줘');
  await vi.waitFor(() => expect(store.listMessages(s.id).at(-1)!.question?.options).toHaveLength(2));
  chat.questions.answer(store.listMessages(s.id).at(-1)!.question!.id, `#${stopped[1].id} 시험 B (stopped)`);
  await asking;
  expect(store.listMessages(s.id).at(-1)!.text).toContain('사유 2');
  expect(navigated).toEqual([{ sessionId: s.id, view: 'log', taskId: stopped[1].id }]);
  expect(stopped.map((t) => store.readTask(t.id).status)).toEqual(['stopped', 'stopped']);

  await chat.runMember(store.readMember(p.id, 'helper'), s.id, null, `업무 #${stopped[1].id} 이어서 실행해줘`);
  expect(stopped.map((t) => store.readTask(t.id).status)).toEqual(['stopped', 'running']);

  // Another project's task is not there for this helper, and nothing opens
  const other = store.createSession(store.addProject(`${project}-other`).id);
  appServer(fake.sdk, chat, other.id);
  expect(await tool('open_log', { task_id: stopped[0].id })).toContain('없습니다');
  expect(navigated).toHaveLength(1);

  // With read access only, resuming is not the helper's to do
  const helper = store.readMember(p.id, 'helper');
  chat.setPermissions(helper.id, { mcp: [{ server: 'app', access: 'read' }] });
  const policy = chat.policy(store.readMemberById(helper.id), p, `session-${s.id}`);
  expect(checkCall(policy, 'mcp__app__resume_task', { task_id: 1 }).kind).not.toBe('allow');
  expect(checkCall(policy, 'mcp__app__find_tasks', {}).kind).toBe('allow');
});
