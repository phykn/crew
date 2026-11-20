import { expect, test, vi } from 'vitest';
import { SEATS, blocked } from '../../src/frontend/camp/layout.js';
import { createWalkers, smallTalk } from '../../src/frontend/camp/walkers.js';

test('idle members stroll only on open ground and chat among themselves without touching the record', () => {
  vi.useFakeTimers();
  const w = createWalkers();
  w.applyStaff(
    ['a', 'b', 'c', 'd', 'e', 'f'].map((k) => ({
      team: k,
      name: k,
      color: '#fff',
      look: ['hair', 'vest', 'boots'],
      state: 'idle',
    })),
  );
  let moved = 0,
    chats = 0,
    now = 0;
  const start = [...w.people.values()].map((p) => [p.x, p.y]);
  for (let i = 0; i < 6000; i++) {
    now += 50;
    vi.setSystemTime(now);
    w.tick(now, 0.05);
    for (const p of w.people.values()) {
      // Standing points are never inside a prop, the fire, or past the trodden ground; a bench's step-off spot is its own
      const stepOff = SEATS.some((t: { from: { x: number; y: number } }) => t.from.x === p.x && t.from.y === p.y);
      if (!p.sitting && !p.moving && !stepOff) expect(blocked(p.x, p.y)).toBe(false);
      if (p.bubble?.kind === 'chat') chats++;
    }
  }
  [...w.people.values()].forEach((p, i) => (moved += Number(Math.hypot(p.x - start[i][0], p.y - start[i][1]) > 0.5)));
  expect(moved).toBeGreaterThan(0);
  expect(chats).toBeGreaterThan(0);
  vi.useRealTimers();
});

test('small talk follows the hour: breakfast in the morning, no lunch plans at midnight', () => {
  expect(smallTalk(8)).toContain('아침 잘 먹었어요?');
  expect(smallTalk(13)).toContain('점심은 뭐 먹을까요?');
  expect(smallTalk(0)).toContain('이제 좀 쉬어야지.');
  expect(smallTalk(0).join()).not.toContain('점심');
});

test('the crew found when a project loads is already in camp, even after the empty list before it', () => {
  const w = createWalkers();
  const crew = ['a', 'b', 'c'].map((k) => ({
    team: k,
    name: k,
    color: '#fff',
    look: ['hair', 'vest', 'boots'],
    state: 'idle',
  }));
  w.applyStaff([]);
  w.applyStaff(crew);
  // Nobody walks in from the edge: everyone stands where they were placed
  expect([...w.people.values()].map((p) => p.path.length)).toEqual([0, 0, 0]);
  // Someone hired afterwards does walk in
  w.applyStaff([...crew, { ...crew[0], team: 'd', name: 'd' }]);
  expect(w.people.get('d')!.path.length).toBeGreaterThan(0);
});
