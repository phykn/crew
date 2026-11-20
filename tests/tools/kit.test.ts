import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { kitTools } from '../../src/backend/tools/kit';
import { openChat } from '../support';

test('도구 makes, deletes, and resets skills for this project only, each on an approved card in manual mode', async () => {
  const { store, fake, chat, p, s } = openChat();
  const other = store.addProject(fs.mkdtempSync(path.join(path.dirname(p.path), 'other-')));
  chat.members.seed(other.id);
  kitTools(fake.sdk, chat, s.id);
  const run = (name: string, a: Record<string, unknown>) => {
    const out = fake.tools.get(name)!(a) as Promise<{ content: { text: string }[] }>;
    const card = store.listMessages(s.id).at(-1)!.question!;
    chat.questions.answer(card.id, '적용');
    return out;
  };

  await run('write_skill', {
    name: 'changelog',
    label: '변경 기록',
    use: 'Keep CHANGELOG.md.',
    body: 'Add one line per change.',
    reason: '변경 기록이 필요합니다',
  });
  expect(chat.members.kit(p.id).texts.changelog).toBe('Add one line per change.');
  await run('write_skill', {
    name: 'changelog',
    label: '변경 기록',
    use: 'Keep CHANGELOG.md.',
    body: 'Add one line per release.',
    reason: '릴리스 단위로',
  });
  expect(store.listMessages(s.id).at(-1)!.text).toContain('− Add one line per change.\n+ Add one line per release.');
  await run('delete_skill', { name: 'code', reason: '쓰지 않습니다' });
  expect(chat.members.kit(p.id).skills.code).toBeUndefined();
  expect(chat.members.settings(store.readMember(p.id, 'coder')).skills).not.toContain('code');
  expect(chat.members.kit(other.id).skills.code).toBeDefined();
  expect(chat.members.kit(other.id).skills.changelog).toBeUndefined();

  // Back to the shipped kit: the made skill goes, the deleted one returns to the members who held it
  await run('reset_skills', { reason: '처음대로' });
  expect(chat.members.kit(p.id).skills.changelog).toBeUndefined();
  expect(chat.members.settings(store.readMember(p.id, 'coder')).skills).toContain('code');
  // A new list of skills shows on the card with what it adds and drops
  await run('assign', { member: 'coder', skills: ['code', 'check', 'debug'], reason: '실패를 읽게' });
  expect(store.listMessages(s.id).at(-1)!.text).toContain(
    '스킬: 코드 작성, 빠른 점검, 실패 분석 (+실패 분석, -작성 기준)',
  );
  expect(chat.members.settings(store.readMember(p.id, 'coder')).skills).toEqual(['code', 'check', 'debug']);
  // Outside manual mode a change applies without a card
  store.setMode(p.id, 'auto');
  const cards = store.listMessages(s.id).length;
  await fake.tools.get('delete_skill')!({ name: 'code', reason: '쓰지 않습니다' });
  expect([chat.members.kit(p.id).skills.code, store.listMessages(s.id).length]).toEqual([undefined, cards]);
});
