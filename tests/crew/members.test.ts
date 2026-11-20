import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test, vi } from 'vitest';
import { secretaryTools } from '../../src/backend/tools/secretary';
import { Crew } from '../../src/backend/crew/shipped';
import { CREW, handback, openChat, reply, toolText, type Turn } from '../support';

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
  let release = () => {};
  const held: Turn = (p, o) =>
    new Promise((r) => (release = () => r(handback('t2', { summary: '번역 수정' })(p, o) as never)));
  const { store, fake, chat, p, s } = openChat(
    {
      인사: [
        reply('', 'hr', { key: 'translator', nickname: '라온', definition: md('번역') }),
        reply('', 'hr', { key: 'translator2', nickname: '가람', definition: md('통역') }),
      ],
      // The temp may write only to its output folder, and its file moves into the project once the task is done
      번역: [
        (prompt, o) => {
          fs.writeFileSync(
            path.join(prompt.match(/Your output folder for files you produce: (.+)/)![1], 'a.ja.md'),
            'こんにちは',
          );
          return handback('t1', { summary: '번역 완료', body: '안녕하세요' })(prompt, o);
        },
      ],
      통역: [held],
      비서: [reply('보고 1'), reply('보고 2')],
    },
    { files: { 'a.md': 'hello' } },
  );
  secretaryTools(fake.sdk, chat, s.id);
  const tool = (name: string, a: Record<string, unknown>) => toolText(fake, name, a);
  const roles = () => CREW.describe(store.listMembers(p.id), chat.members.kit(p.id)).map((m) => m.role);

  expect(await tool('hire', { need: '문서 번역', temp: true })).toContain('번역(라온)을 알바로');
  const temp = store.readMember(p.id, 'translator');
  // A temp gets no shell and writes only into its output folder
  expect(chat.members.settings(temp)).toMatchObject({ tools: ['read', 'search', 'write'], write: 'output' });
  expect(roles()).toContain('번역');
  await tool('start_task', { kind: 'code', title: '번역', request: 'a.md 번역', role: '번역' });
  const [task] = store.listTasks(s.id);
  await vi.waitFor(() => expect(fs.readFileSync(path.join(p.path, 'a.ja.md'), 'utf8')).toBe('こんにちは'));
  expect(store.readTask(task.id).status).toBe('done');
  expect(roles()).not.toContain('번역');
  chat.members.fire(temp.id);
  expect(
    store
      .listEvents(s.id)
      .filter((e) => e.kind === 'leave')
      .map((e) => e.text),
  ).toEqual(['번역(라온) 퇴장']);

  // The fix goes to a new temp, handed what the first one saved; the one who left gets nothing
  await tool('hire', { need: '번역 수정', temp: true });
  expect(await tool('reassign', { task_id: task.id, from_role: '번역', to_role: '통역' })).toContain('번역 작업');
  expect(chat.tasks.reopen(task.id, '존댓말로')).toBe(true);
  await vi.waitFor(() => expect(fake.calls.filter((c) => c.role === '통역')).toHaveLength(1));
  expect(fake.calls.find((c) => c.role === '통역')!.prompt).toContain('안녕하세요');
  expect(fake.calls.filter((c) => c.role === '번역')).toHaveLength(1);

  // Let go twice while at work: one 퇴장 예정, one 퇴장, after its step
  const second = store.readMember(p.id, 'translator2');
  chat.members.fire(second.id);
  chat.members.fire(second.id);
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
  const { store, chat, p, s } = openChat({
    인사: [
      reply('', 'hr', { fits: { key: 'researcher', reason: '공식 문서 조사가 이미 조사의 일입니다' } }),
      reply('', 'hr', {
        key: 'translator',
        nickname: '라온',
        definition: md('번역').replace('hood, robe, boots', 'cap, coat, boots'),
      }),
    ],
  });
  expect(await chat.members.hire(s.id, '버전 조사', false)).toContain('조사(researcher)가 이미 맞습니다');
  expect(await chat.members.hire(s.id, '번역', false)).toContain('정의가 맞지 않습니다');
  expect(store.listMembers(p.id)).toHaveLength(10);
});

test('asked to hire a role that was let go, 인사 names it and it comes back instead of a twin', async () => {
  const { store, fake, chat, p, s } = openChat({
    인사: [reply('', 'hr', { fits: { key: 'tester', reason: '시험 담당이 있습니다' } })],
  });
  const tester = store.readMember(p.id, 'tester');
  chat.members.fire(tester.id);
  expect(await chat.members.hire(s.id, '시험 담당 다시', false)).toContain('다시 고용했습니다');
  expect(store.readMemberById(tester.id).status).toBe('hired');
  expect(store.listMembers(p.id)).toHaveLength(10);
  // 인사 is told who was let go, so it can name them
  expect(fake.calls.find((c) => c.role === '인사')!.prompt).toContain('(tester) [let go]');
});

test('a permission change is recorded by name, never with the server settings it touches', () => {
  // A crew copy whose browser server carries a token in its environment
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crew-copy-'));
  fs.cpSync(CREW.dir, dir, { recursive: true });
  const file = path.join(dir, 'mcp.json');
  const mcp = JSON.parse(fs.readFileSync(file, 'utf-8'));
  mcp.mcpServers.browser.env = { API_TOKEN: 'secret-123' };
  fs.writeFileSync(file, JSON.stringify(mcp));
  const { store, chat, p } = openChat({}, { crew: new Crew(dir) });
  const reviewer = store.readMember(p.id, 'reviewer');
  chat.members.setPermissions(reviewer.id, {
    mcp: [{ server: 'browser', access: 'read' }],
    skills: ['plan-review', 'code-review'],
  });

  const [change] = store.listPermissionChanges(reviewer.id);
  expect(change.change).toBe('스킬 -report, MCP +browser(읽기만), MCP -browser(전체)');
  expect(JSON.stringify(store.listPermissionChanges(reviewer.id))).not.toContain('secret-123');
});

test("a crew change is logged in the project's latest session, where the user is looking", () => {
  const { store, chat, p, s } = openChat();
  const latest = chat.createSession(p.id);
  chat.members.fire(store.readMember(p.id, 'tester').id);
  expect([store.listEvents(s.id), store.listEvents(latest.id).map((e) => e.text)]).toEqual([[], ['시험(솔잎) 퇴장']]);
});
