import { expect, test, vi } from 'vitest';
import { FIRE, GROUND, SEATS, blocked } from '../../src/frontend/camp/layout.js';
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
      if (!p.sitting && !p.moving && !p.entering && !stepOff) expect(blocked(p.x, p.y)).toBe(false);
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

test('the crew the app opens with walks in from out of sight on every side, even after the empty list before it', () => {
  const w = createWalkers();
  const crew = ['a', 'b', 'c', 'd'].map((k) => ({
    team: k,
    name: k,
    color: '#fff',
    look: ['hair', 'vest', 'boots'],
    state: 'idle',
  }));
  w.applyStaff([]);
  w.applyStaff(crew);
  const people = [...w.people.values()];
  // Everyone starts past the trees and has a way in
  expect(people.every((p) => p.path.length > 0 && Math.hypot(p.x - FIRE.x, p.y - FIRE.y) > GROUND)).toBe(true);
  // Screen right-left is x - y and down-up is x + y; the four starts lie off more than two edges
  const edge = (p: { x: number; y: number }) => {
    const sx = p.x - FIRE.x - (p.y - FIRE.y),
      sy = p.x - FIRE.x + (p.y - FIRE.y);
    return Math.abs(sx) > Math.abs(sy) ? Math.sign(sx) : 2 * Math.sign(sy);
  };
  expect(new Set(people.map(edge)).size).toBeGreaterThan(2);
  // Someone hired afterwards walks in too
  w.applyStaff([...crew, { ...crew[0], team: 'e', name: 'e' }]);
  expect(w.people.get('e')!.path.length).toBeGreaterThan(0);
});
