import { FIRE, GROUND } from '../layout.js';
import { COLOR as C } from '../tokens.js';
import { TW, TH, iso } from '../projection.js';
import { prism, shadow } from './shapes.js';

// A fixed seed keeps the ground pattern identical across resizes and reloads
function seeded(seed) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

// Everything flat that never moves, painted once per resize; view is the visible area in world pixels
export function paintGround(ctx, view) {
  const rnd = seeded(7);
  const blot = (x, y, r, color, alpha) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'transparent');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  };
  const speckle = (x, y, w, h, n, colors, alpha) => {
    ctx.globalAlpha = alpha;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
      ctx.fillRect(x + rnd() * w, y + rnd() * h, 1 + rnd() * 2, 1);
    }
    ctx.globalAlpha = 1;
  };
  // Grass is soft blotches at two scales, never a grid, so the ground reads as land rather than a board
  ctx.fillStyle = C.grass;
  ctx.fillRect(view.x, view.y, view.w, view.h);
  const tones = [C.grassDark, C.grassLight, C.grassDry];
  for (let i = 0, n = (view.w * view.h) / 2500; i < n; i++) {
    blot(view.x + rnd() * view.w, view.y + rnd() * view.h, 30 + rnd() * 60, tones[Math.floor(rnd() * 3)], 0.5);
  }
  speckle(view.x, view.y, view.w, view.h, (view.w * view.h) / 90, [C.grassDark, C.grassLight], 0.6);

  // The trodden ground hides the grass and fades into it only at its edge; it darkens evenly toward the fire,
  // since scattered worn patches read as stains under the firelight
  const fire = iso(FIRE.x, FIRE.y),
    rx = ((GROUND + 0.6) * TW) / 2,
    ry = ((GROUND + 0.6) * TH) / 2;
  // A wide fade at the edge, so under firelight the patch never shows a rim
  const fade = (stops) => {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 1.2);
    for (const [at, color] of stops) g.addColorStop(at, color);
    ctx.fillStyle = g;
    ctx.fillRect(-rx * 1.2, -rx * 1.2, rx * 2.4, rx * 2.4);
  };
  ctx.save();
  ctx.translate(fire.x, fire.y);
  ctx.scale(1, ry / rx);
  fade([
    [0, C.dirt],
    [0.55, C.dirt],
    [1, 'transparent'],
  ]);
  ctx.globalAlpha = 0.7;
  fade([
    [0, C.dirtWorn],
    [0.65, 'transparent'],
  ]);
  ctx.restore();
  ctx.globalAlpha = 1;
  blot(fire.x, fire.y, 70, C.barkDark, 0.6);
  speckle(fire.x - rx, fire.y - ry, rx * 2, ry * 2, 900, [C.rockDark, C.dirtWorn, C.rock], 0.5);

  // A ring of stones and three logs make the hearth; the flames themselves move, so they are painted each frame
  for (let k = 0; k < 12; k++) {
    const a = (k * Math.PI) / 6,
      p = iso(FIRE.x + 1.15 * Math.cos(a), FIRE.y + 1.15 * Math.sin(a));
    ctx.fillStyle = C.rockDark;
    ctx.fillRect(p.x - 4, p.y - 3, 8, 5);
    ctx.fillStyle = k % 3 ? C.rock : C.rockLight;
    ctx.fillRect(p.x - 4, p.y - 4, 7, 2);
  }
  for (const [dx, dy] of [
    [-0.7, -0.15],
    [0.1, -0.15],
    [-0.3, 0.35],
  ]) {
    shadow(ctx, FIRE.x + dx + 0.3, FIRE.y + dy + 0.3, 9, 3);
    prism(ctx, { x: FIRE.x + dx, y: FIRE.y + dy, w: 0.6, h: 0.25, z: 4 }, C.wood, C.woodDark, C.barkDark);
  }
}
