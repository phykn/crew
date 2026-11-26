import { describe, expect, it } from 'vitest';
import { grain, rim } from '../../src/frontend/camp/art/finish.js';

// A tiny picture from rows of '#' (opaque grey) and '.' (clear)
const picture = (rows: string[]) => {
  const w = rows[0].length,
    d = new Uint8ClampedArray(w * rows.length * 4);
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && d.set([100, 100, 100, 255], (y * w + x) * 4)));
  return { d, w, h: rows.length };
};

describe('finishing a baked prop', () => {
  it('lights the top edge and shades the bottom edge', () => {
    const { d, w, h } = picture(['#', '#', '#']);
    rim(d, w, h);
    expect([d[0], d[4], d[8]]).toEqual([110, 100, 88]);
  });

  it('scatters the same grain for the same seed and leaves clear pixels alone', () => {
    const a = picture(['##.']).d,
      b = picture(['##.']).d;
    grain(a, 3);
    grain(b, 3);
    expect([...a]).toEqual([...b]);
    expect(a[0]).not.toBe(100);
    expect(Array.from(a.slice(8))).toEqual([0, 0, 0, 0]);
  });
});
