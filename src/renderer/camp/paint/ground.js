import { FIRE, GROUND } from '../layout.js';
import { COLOR as C } from '../tokens.js';
import { TW, TH, iso } from '../projection.js';
import { oval, prism, shadow } from './shapes.js';

// A fixed seed keeps the ground pattern identical across resizes and reloads
function seeded(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

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
  for (let i = 0, n = view.w * view.h / 2500; i < n; i++) {
    blot(view.x + rnd() * view.w, view.y + rnd() * view.h, 30 + rnd() * 60, tones[Math.floor(rnd() * 3)], 0.5);
  }
  speckle(view.x, view.y, view.w, view.h, view.w * view.h / 90, [C.grassDark, C.grassLight], 0.6);

  // The trodden ground fades into the grass at its edge, and is worn darkest near the fire
  const fire = iso(FIRE.x, FIRE.y), rx = (GROUND + 0.6) * TW / 2, ry = (GROUND + 0.6) * TH / 2;
  ctx.filter = 'blur(10px)';
  ctx.globalAlpha = 0.8;
  oval(ctx, fire.x, fire.y, rx, ry, C.dirt);
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  for (let i = 0; i < 60; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * GROUND * 0.9;
    const p = iso(FIRE.x + d * Math.cos(a), FIRE.y + d * Math.sin(a));
    blot(p.x, p.y, 10 + rnd() * 26, rnd() < 0.6 ? C.dirtWorn : C.grassDry, 0.5);
  }
  blot(fire.x, fire.y, 70, C.barkDark, 0.6);
  speckle(fire.x - rx, fire.y - ry, rx * 2, ry * 2, 900, [C.rockDark, C.dirtWorn, C.rock], 0.5);

  // A ring of stones and three logs make the hearth; the flames themselves move, so they are painted each frame
  for (let k = 0; k < 12; k++) {
    const a = k * Math.PI / 6, p = iso(FIRE.x + 1.15 * Math.cos(a), FIRE.y + 1.15 * Math.sin(a));
    ctx.fillStyle = C.rockDark;
    ctx.fillRect(p.x - 4, p.y - 3, 8, 5);
    ctx.fillStyle = k % 3 ? C.rock : C.rockLight;
    ctx.fillRect(p.x - 4, p.y - 4, 7, 2);
  }
  for (const [dx, dy] of [[-0.7, -0.15], [0.1, -0.15], [-0.3, 0.35]]) {
    shadow(ctx, FIRE.x + dx + 0.3, FIRE.y + dy + 0.3, 9, 3);
    prism(ctx, { x: FIRE.x + dx, y: FIRE.y + dy, w: 0.6, h: 0.25, z: 4 }, C.wood, C.woodDark, C.barkDark);
  }
}
