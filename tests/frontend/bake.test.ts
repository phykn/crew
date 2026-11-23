import { expect, test } from 'vitest';
import { textureOf } from '../../src/frontend/camp/stage/bake';

test('a baked canvas keeps its size, so its painting is never wiped, at any camp scale', () => {
  // Pixi resizing a canvas clears it; a stand-in canvas shows whether it was resized
  const shrunk: string[] = [];
  for (let res = 0.5; res < 4; res += 0.0137)
    for (let w = 1; w < 300; w += 7) {
      const canvas = { width: w, height: w + 3 } as unknown as HTMLCanvasElement;
      const t = textureOf(canvas, res);
      if (canvas.width !== w || canvas.height !== w + 3) shrunk.push(`${w}@${res}`);
      expect(t.width).toBeCloseTo(w / res, 6);
    }
  expect(shrunk).toEqual([]);
});
