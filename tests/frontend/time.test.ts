import { expect, test } from 'vitest';
import { clock, duration, stamp } from '../../src/frontend/time';

test("a UTC record time reads in the user's own time zone, across the date line", () => {
  const zone = process.env.TZ;
  process.env.TZ = 'Asia/Seoul';
  try {
    expect(clock('2026-11-19T23:15:00.000Z')).toBe('08:15');
    expect(stamp('2026-11-19T23:15:00.000Z')).toBe('11-20 08:15');
    expect(clock('2026-11-19T23:15:07.000Z', true)).toBe('08:15:07');
  } finally {
    process.env.TZ = zone;
  }
});

test('a run time reads in seconds, then minutes, then hours', () => {
  expect(duration(42.4)).toBe('42초');
  expect(duration(754)).toBe('12분 34초');
  expect(duration(3 * 3600 + 5 * 60 + 9)).toBe('3시간 5분');
});
