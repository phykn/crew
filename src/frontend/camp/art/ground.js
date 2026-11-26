import { FIRE, RUGS } from '../layout.js';
import { COLOR as C } from '../palette.js';
import { TW, TH, iso } from '../projection.js';
import { drawProp } from './props.js';

// Ground is painted in blocks of this many world pixels, so every edge on it steps like the pixel art over it
const BLOCK = 2;

// Smooth noise from 0 to 1 over the ground, the same for the same point on every resize and reload
const hash = (x, y, seed) => {
  const v = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return v - Math.floor(v);
};
function noise(x, y, seed) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = x - ix,
    fy = y - iy,
    sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy);
  const top = hash(ix, iy, seed) + (hash(ix + 1, iy, seed) - hash(ix, iy, seed)) * sx,
    low = hash(ix, iy + 1, seed) + (hash(ix + 1, iy + 1, seed) - hash(ix, iy + 1, seed)) * sx;
  return top + (low - top) * sy;
}
// Two scales together: broad patches with a little unevenness along their edges
const patch = (x, y, seed, size) =>
  noise(x / size, y / size, seed) * 0.75 + noise((x * 3) / size, (y * 3) / size, seed + 9) * 0.25;

// The ground point (in tiles) under a world pixel
const origin = iso(0, 0);
const tileOf = (sx, sy) => {
  const a = (sx - origin.x) / (TW / 2),
    b = (sy - origin.y) / (TH / 2);
  return [(a + b) / 2, (b - a) / 2];
};

// What the ground is at a point: one grass field in broad, quiet patches of two close tones; what the fire does to it
// is left to the light map
const grassAt = (x, y) => (patch(x, y, 11, 5) > 0.55 ? C.grassLight : C.grass);

// Everything flat that never moves, painted once per resize; view is the visible area in world pixels
export function paintGround(ctx, view) {
  // One pixel per block, stretched in one draw, since blocks filled one by one at a fractional scale leave seams
  const x0 = Math.floor(view.x / BLOCK) * BLOCK,
    y0 = Math.floor(view.y / BLOCK) * BLOCK,
    cols = Math.ceil((view.x + view.w - x0) / BLOCK),
    rows = Math.ceil((view.y + view.h - y0) / BLOCK),
    field = new OffscreenCanvas(cols, rows),
    f = field.getContext('2d');
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const [x, y] = tileOf(x0 + (i + 0.5) * BLOCK, y0 + (j + 0.5) * BLOCK);
      f.fillStyle = grassAt(x, y);
      f.fillRect(i, j, 1, 1);
    }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(field, x0, y0, cols * BLOCK, rows * BLOCK);
  ctx.imageSmoothingEnabled = true;
  // The hearth and the rugs lie low enough to be part of the ground; the flames themselves move, so they are painted each frame
  drawProp(ctx, { kind: 'hearth', ...FIRE });
  for (const r of RUGS) drawProp(ctx, { kind: 'rug', ...r });
}
