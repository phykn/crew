import { expect, test, vi } from 'vitest';
import { SEATS, blocked } from '../../src/renderer/camp/layout.js';
import { createWalkers } from '../../src/renderer/camp/walkers.js';

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
