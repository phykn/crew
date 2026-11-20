import { expect, test, vi } from 'vitest';
import fs from 'node:fs';
import { campState } from '../../src/backend/window/camp';
import { createWalkers } from '../../src/frontend/camp/walkers.js';
import { handback, openChat, reply, type Turn } from '../support';

const staff = (keys: string[], working: Record<string, string>) =>
  keys.map((k) => ({
    team: k,
    name: k,
    color: '#fff',
    look: ['hair', 'vest', 'boots'],
    state: working[k] ? 'working' : 'idle',
  }));
const said = (w: ReturnType<typeof createWalkers>, key: string) => w.people.get(key)?.bubble?.text ?? null;

test('the record plays in the camp: assignment, work, request, waiting, failure, report, hire and leave; a late camp replays nothing', async () => {
  let release = () => {};
  const held: Turn = (p, o) =>
    new Promise((r) => (release = () => r(handback('c', { summary: '계획' })(p, o) as never)));
  const { store, fake, chat, p, s } = openChat({
    기획: [held],
    리뷰: [handback('r', { summary: '반려', verdict: 'rework', points: ['x'] })],
    비서: [reply('보고')],
  });
  const keys = ['orchestrator', 'advisor', 'reviewer', 'stylist'];
  const w = createWalkers();
  const late = createWalkers();
  const feed = (x: ReturnType<typeof createWalkers>, team = keys) => {
    const st = campState(chat, s.id);
    x.applyStaff(staff(team, st.working));
    x.applyNow(st.working);
    x.applyLog(st.log);
    return st;
  };
  feed(w);

  chat.tasks.start(s.id, 'code', '검색', 'r');
  await vi.waitFor(() => expect(fake.calls.some((c) => c.role === '기획')).toBe(true));
  const st = feed(w);
  expect(st.working.advisor).toBe('계획 중');
  // 비서 walks over to hand the work out
  expect(w.people.get('orchestrator')!.path.at(-1)?.say?.text).toContain('업무 배정');

  const q = chat.questions.choose(s.id, '?', ['a', 'b']);
  expect(feed(w).working.orchestrator).toBe('?');
  chat.questions.answer(store.listMessages(s.id).at(-1)!.question!.id, 'a');
  await q;

  store.addEvent({
    sessionId: s.id,
    taskId: null,
    memberId: store.readMember(p.id, 'advisor').id,
    kind: 'request',
    text: '기획 → 표준: 이름?',
    detail: JSON.stringify({ requestId: 1, to: store.readMember(p.id, 'stylist').id }),
  });
  feed(w);
  expect(w.people.get('advisor')!.path.at(-1)?.say?.text).toBe('요청 메모');

  release();
  await vi.waitFor(() => expect(['failed', 'fixing', 'running', 'reviewing']).toContain(store.readTask(1).status));
  await vi.waitFor(() => expect(campState(chat, s.id).log.some((l) => l.text === '수정 요청')).toBe(true));
  feed(w);
  expect(said(w, 'reviewer')).toBe('수정 요청');
  store.writeTaskStatus(1, 'done', '', '검색 업무 완료');
  feed(w);
  expect(said(w, 'orchestrator')).toBe('완료 보고');

  // Hired walks in, let go walks out
  feed(w, [...keys, 'images']);
  expect(w.people.get('images')).toBeTruthy();
  feed(
    w,
    keys.filter((k) => k !== 'stylist'),
  );
  expect(w.people.get('stylist')?.leaving ?? 'gone').toBeTruthy();

  // A camp opened now starts from the record as it is, with no old scene playing
  feed(late);
  expect([...late.people.values()].every((x) => !x.bubble && !x.path.some((q2: { say?: unknown }) => q2.say))).toBe(
    true,
  );
});

test('scenes come from what a line records, not its words: a passing step that mentions 실패 plays nothing, a request to a spaced role plays', () => {
  const { store, chat, p, s } = openChat();
  const definition = fs.readFileSync('crew/agents/researcher.md', 'utf-8').replace('role: 조사', 'role: 번역 담당');
  const translator = store.addMember(p.id, {
    key: 'translator',
    nickname: '라온',
    model: 'haiku',
    definition,
    temp: false,
  });
  const advisor = store.readMember(p.id, 'advisor');
  const hb = { summary: '실패 케이스 시험 추가', body: '', verdict: 'pass', points: [], files: [], checks: [] };
  store.addEvent({
    sessionId: s.id,
    taskId: null,
    memberId: advisor.id,
    kind: 'step',
    text: '기획: 계획 완료 — 실패 케이스 시험 추가',
    detail: JSON.stringify(hb),
  });
  store.addEvent({
    sessionId: s.id,
    taskId: null,
    memberId: advisor.id,
    kind: 'request',
    text: '기획 → 번역 담당: 용어집 있나요?',
    detail: JSON.stringify({ requestId: 1, to: translator.id }),
  });
  expect(campState(chat, s.id).log.map((l) => [l.who, l.to, l.text])).toEqual([['advisor', 'translator', '요청 메모']]);
});
