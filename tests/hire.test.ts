import fs from 'node:fs';
import path from 'node:path';
import { expect, test, vi } from 'vitest';
import { Chat } from '../src/main/chat';
import { secretaryTools } from '../src/main/crew-tools';
import { CREW, fakeCrew, handback, openScratch, reply, type Turn } from './support';

// mcp: none is how models often write an empty list
const md = (role: string) => `---
role: ${role}
color: #44aa88
model: sonnet
tools: read, search, write, shell
write: project
skills: research
mcp: none
look: hood, robe, boots
description: Translates the project's text.
---

You are the crew's **${role}**. You translate.
`;

test('인사 drafts a temp, 비서 brings it in and it leaves once; its work is fixed by the next temp, not by it', async () => {
  const { store, project, paths } = openScratch({ 'a.md': 'hello' });
  let release = () => {};
  const held: Turn = (p, o) =>
    new Promise((r) => (release = () => r(handback('t2', { summary: '번역 수정' })(p, o) as never)));
  const fake = fakeCrew({
    인사: [
      reply('', 'hr', { key: 'translator', nickname: '라온', definition: md('번역') }),
      reply('', 'hr', { key: 'translator2', nickname: '가람', definition: md('통역') }),
    ],
    // The temp may write only to its output folder, so its file waits there for the user's word
    번역: [
      (p, o) => {
        fs.writeFileSync(
          path.join(p.match(/Your output folder for files you produce: (.+)/)![1], 'a.ja.md'),
          'こんにちは',
        );
        return handback('t1', { summary: '번역 완료', body: '안녕하세요' })(p, o);
      },
    ],
    통역: [held],
    비서: [reply('보고 1'), reply('보고 2')],
  });
  const chat = new Chat(
    store,
    async () => fake.sdk,
    CREW,
    () => {},
    paths,
  );
  const p = store.addProject(project);
  chat.seed(p.id);
  const s = store.createSession(p.id);
  secretaryTools(fake.sdk, chat, s.id);
  const tool = (name: string, a: Record<string, unknown>) =>
    fake.tools.get(name)!(a) as Promise<{ content: { text: string }[] }>;
  const roles = () => CREW.describe(store.listMembers(p.id), chat.kit(p.id)).map((m) => m.role);

  expect((await tool('hire', { need: '문서 번역', temp: true })).content[0].text).toContain('번역(라온)을 알바로');
  const temp = store.readMember(p.id, 'translator');
  // A temp gets no shell and writes only into its output folder
  expect(chat.settings(temp)).toMatchObject({ tools: ['read', 'search', 'write'], write: 'output' });
  expect(roles()).toContain('번역');
  await tool('start_task', { kind: 'code', title: '번역', request: 'a.md 번역', role: '번역' });
  const [task] = store.listTasks(s.id);
  await vi.waitFor(() => expect(store.openQuestionIds(task.id)).toHaveLength(1));
  chat.questions.answer(store.openQuestionIds(task.id)[0], '프로젝트로 옮기기');
  await vi.waitFor(() => expect(fs.readFileSync(path.join(p.path, 'a.ja.md'), 'utf8')).toBe('こんにちは'));
  expect(store.readTask(task.id).status).toBe('done');
  expect(roles()).not.toContain('번역');
  chat.fire(temp.id);
  expect(
    store
      .listEvents(s.id)
      .filter((e) => e.kind === 'leave')
      .map((e) => e.text),
  ).toEqual(['번역(라온) 퇴장']);

  // The fix goes to a new temp, handed what the first one saved; the one who left gets nothing
  await tool('hire', { need: '번역 수정', temp: true });
  expect((await tool('reassign', { task_id: task.id, from_role: '번역', to_role: '통역' })).content[0].text).toContain(
    '번역 작업',
  );
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
  expect(
    store
      .listEvents(s.id)
      .filter((e) => e.kind === 'leave')
      .map((e) => e.text),
  ).toEqual(['번역(라온) 퇴장', '통역(가람) 퇴장 예정: 맡은 단계를 마치고 나갑니다', '통역(가람) 퇴장']);
});

test('인사 names a member who already fits instead of drafting, and a draft with a sprite part the camp lacks is refused', async () => {
  const { store, project, paths } = openScratch();
  const fake = fakeCrew({
    인사: [
      reply('', 'hr', { fits: { key: 'researcher', reason: '공식 문서 조사가 이미 조사의 일입니다' } }),
      reply('', 'hr', {
        key: 'translator',
        nickname: '라온',
        definition: md('번역').replace('hood, robe, boots', 'cap, coat, boots'),
      }),
    ],
  });
  const chat = new Chat(
    store,
    async () => fake.sdk,
    CREW,
    () => {},
    paths,
  );
  const p = store.addProject(project);
  chat.seed(p.id);
  const s = store.createSession(p.id);
  expect(await chat.hire(s.id, '버전 조사', false)).toContain('조사(researcher)이 이미 맞습니다');
  expect(await chat.hire(s.id, '번역', false)).toContain('정의가 맞지 않습니다');
  expect(store.listMembers(p.id)).toHaveLength(11);
});
