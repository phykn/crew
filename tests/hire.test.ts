import { expect, test, vi } from 'vitest';
import { Chat } from '../src/main/chat';
import { secretaryTools } from '../src/main/crew-tools';
import { CREW, fakeCrew, handback, openScratch, reply, type Turn } from './support';

const md = (role: string, nickname: string) => `---
role: ${role}
nickname: ${nickname}
color: #44aa88
model: sonnet
tools: read, search, write, shell
write: project
skills: research
look: cap, coat, boots
description: Translates the project's text.
---

You are the crew's **${role}**. You translate.
`;

test('인사 drafts a temp, 비서 brings it in and it leaves once; its work is fixed by the next temp, not by it', async () => {
  const { store, project, paths } = openScratch({ 'a.md': 'hello' });
  let release = () => {};
  const held: Turn = (p, o) => new Promise((r) => (release = () => r(handback('t2', { summary: '번역 수정' })(p, o) as never)));
  const fake = fakeCrew({
    인사: [reply('', 'hr', { key: 'translator', definition: md('번역', '라온') }), reply('', 'hr', { key: 'translator2', definition: md('통역', '가람') })],
    번역: [handback('t1', { summary: '번역 완료', body: '안녕하세요' })],
    통역: [held],
    비서: [reply('보고 1'), reply('보고 2')],
  });
  const chat = new Chat(store, async () => fake.sdk, CREW, () => {}, paths);
  const p = store.addProject(project);
  chat.seed(p.id);
  const s = store.createSession(p.id);
  secretaryTools(fake.sdk, chat, s.id);
  const tool = (name: string, a: Record<string, unknown>) => fake.tools.get(name)!(a) as Promise<{ content: { text: string }[] }>;
  const roles = () => CREW.describe(store.listMembers(p.id)).map((m) => m.role);

  expect((await tool('hire', { need: '문서 번역', temp: true })).content[0].text).toContain('번역(라온)을 알바로');
  const temp = store.readMember(p.id, 'translator');
  // A temp gets no shell and writes only into its output folder
  expect(chat.settings(temp)).toMatchObject({ tools: ['read', 'search', 'write'], write: 'output' });
  expect(roles()).toContain('번역');
  await tool('start_task', { kind: 'code', title: '번역', request: 'a.md 번역', role: '번역' });
  const [task] = store.listTasks(s.id);
  await vi.waitFor(() => expect(store.readTask(task.id).status).toBe('done'));
  expect(roles()).not.toContain('번역');
  chat.fire(temp.id);
  expect(store.listEvents(s.id).filter((e) => e.kind === 'leave').map((e) => e.text)).toEqual(['번역(라온) 퇴장']);

  // The fix goes to a new temp, handed what the first one saved; the one who left gets nothing
  await tool('hire', { need: '번역 수정', temp: true });
  expect((await tool('reassign', { task_id: task.id, from_role: '번역', to_role: '통역' })).content[0].text).toContain('번역 작업');
  expect(chat.tasks.reopen(task.id, '존댓말로')).toBe(true);
  await vi.waitFor(() => expect(fake.calls.filter((c) => c.role === '통역')).toHaveLength(1));
  expect(fake.calls.find((c) => c.role === '통역')!.prompt).toContain('안녕하세요');
  expect(fake.calls.filter((c) => c.role === '번역')).toHaveLength(1);

  // Let go twice while at work: one 퇴장 예정, one 퇴장, after its step
  const second = store.readMember(p.id, 'translator2');
  chat.fire(second.id);
  chat.fire(second.id);
  expect(store.readMemberById(second.id).leaving).toBe(true);
  release();
  await vi.waitFor(() => expect(store.readMemberById(second.id).status).toBe('unhired'));
  expect(store.listEvents(s.id).filter((e) => e.kind === 'leave').map((e) => e.text)).toEqual([
    '번역(라온) 퇴장',
    '통역(가람) 퇴장 예정: 맡은 단계를 마치고 나갑니다',
    '통역(가람) 퇴장',
  ]);
});
