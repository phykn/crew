import { FIRE } from '../layout.js';
import { iso } from '../projection.js';
import { COLOR as C } from '../tokens.js';

export function drawTorch(ctx, t, i, now) {
  const p = iso(t.x, t.y),
    h = 6 + Math.sin(now / 90 + i * 1.3) * 2;
  ctx.fillStyle = C.pole;
  ctx.fillRect(p.x - 1.5, p.y - 30, 3, 30);
  ctx.fillStyle = C.iron;
  ctx.fillRect(p.x - 3, p.y - 31, 6, 3);
  // A flame that narrows upward reads as fire, a full block reads as a lamp
  ctx.fillStyle = C.flame;
  ctx.fillRect(p.x - 3, p.y - 31 - h * 0.5, 6, h * 0.5);
  ctx.fillRect(p.x - 2, p.y - 31 - h * 0.8, 4, h * 0.3);
  ctx.fillRect(p.x - 1, p.y - 31 - h, 2, h * 0.2);
  ctx.fillStyle = C.flameCore;
  ctx.fillRect(p.x - 1, p.y - 31 - h * 0.6, 2, h * 0.5);
}

export function drawFire(ctx, now) {
  const p = iso(FIRE.x, FIRE.y);
  for (let k = 0; k < 4; k++) {
    const h = 9 + Math.sin(now / 80 + k * 1.7) * 4;
    ctx.fillStyle = k % 2 ? C.flameDeep : C.flame;
    ctx.fillRect(p.x - 8 + k * 4, p.y - 2 - h, 4, h);
  }
  ctx.fillStyle = C.flameCore;
  ctx.fillRect(p.x - 1.5, p.y - 8, 3, 5);
  // Sparks follow fixed paths, so the fire breathes without random flashing
  for (let k = 0; k < 6; k++) {
    const t = (now / 1400 + k / 6) % 1;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = k % 2 ? C.flameCore : C.flame;
    ctx.fillRect(p.x + (k - 2.5) * 2 + Math.sin(t * 6 + k * 2.1) * 6, p.y - 10 - t * 40, 1, 1);
  }
  ctx.globalAlpha = 1;
}
