import { describe, expect, it } from 'vitest';
import { grain, outline, rim, upscale } from '../../src/frontend/camp/art/finish.js';

// A tiny picture from rows of '#' (opaque grey) and '.' (clear)
const picture = (rows: string[]) => {
  const w = rows[0].length,
    d = new Uint8ClampedArray(w * rows.length * 4);
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch === '#' && d.set([100, 100, 100, 255], (y * w + x) * 4)));
  return { d, w, h: rows.length };
};
const alpha = (d: Uint8ClampedArray, w: number, x: number, y: number) => d[(y * w + x) * 4 + 3];

describe('finishing a sprite', () => {
  it('doubles the size and rounds a diagonal step instead of keeping a square corner', () => {
    const { d, w, h } = picture(['#.', '##']);
    const big = upscale(d, w, h);
    expect(big.length).toBe(w * h * 16);
    // The clear pixel's corner that meets two solid neighbours fills in; its far corner stays clear
    expect(alpha(big, 4, 2, 1)).toBe(255);
    expect(alpha(big, 4, 3, 0)).toBe(0);
  });

  it('draws a dark line on every clear pixel that touches the figure, and nowhere else', () => {
    const { d, w, h } = picture(['...', '.#.', '...']);
    outline(d, w, h);
    expect([alpha(d, 3, 1, 0), alpha(d, 3, 0, 1), alpha(d, 3, 2, 1), alpha(d, 3, 1, 2)]).toEqual([220, 220, 220, 220]);
    expect(alpha(d, 3, 0, 0)).toBe(0);
    expect(d[(1 * 3 + 1) * 4]).toBe(100);
  });

  it('lights the top edge and shades the bottom edge', () => {
    const { d, w, h } = picture(['#', '#', '#']);
    rim(d, w, h);
    expect([d[0], d[4], d[8]]).toEqual([118, 100, 78]);
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
