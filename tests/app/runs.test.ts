import { expect, test } from 'vitest';
import { NOT_HIRED } from '../../src/backend/domain/records';
import { openChat, reply } from '../support';

test('a model change starts a fresh Claude session that is handed the conversation', async () => {
  const { store, fake, chat, p, s } = openChat({ 비서: [reply('안녕하세요', 'claude-a'), reply('네', 'claude-b')] });
  await chat.send(s.id, '첫 질문');
  store.updateMember(store.readMember(p.id, 'orchestrator').id, { model: 'opus' });
  await chat.send(s.id, '두 번째');
  expect(fake.calls.map((c) => c.options.resume)).toEqual([undefined, undefined]);
  expect(fake.calls[1].prompt).toContain('[Handoff]');
  expect(fake.calls[1].prompt).toContain('User: 첫 질문');
});

test('a member let go while queued does not run, and hiring again keeps them', async () => {
  const { store, fake, chat, p, s } = openChat();
  const researcher = store.readMember(p.id, 'researcher');
  chat.members.fire(researcher.id);
  expect(store.readMemberById(researcher.id).status).toBe('unhired');
  expect((await chat.runs.run(researcher, s.id, null, 'x')).error).toBe(NOT_HIRED);
  expect(fake.calls).toHaveLength(0);

  store.writeLeaving(researcher.id, true);
  chat.members.rehire(researcher.id);
  expect(store.readMemberById(researcher.id)).toMatchObject({ status: 'hired', leaving: false });
});

test('the busy feed says when the first run starts and the last one ends, so the computer stays awake in between', async () => {
  const busy: unknown[] = [];
  const { chat, s } = openChat(
    { 비서: [reply('네')] },
    { emit: (channel, payload) => channel === 'busy' && busy.push(payload) },
  );
  await chat.send(s.id, '안녕');
  expect(busy).toEqual([true, false]);
});
