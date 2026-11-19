import { FIRE } from '../layout.js';
import { iso } from '../projection.js';
import { COLOR as C } from '../tokens.js';

export function drawTorch(ctx, t, i, now, still) {
  const p = iso(t.x, t.y), h = still ? 7 : 6 + Math.sin(now / 90 + i * 1.3) * 2;
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

// Without a readable record the fire is out: embers and rising smoke instead of flames
function drawEmbers(ctx, p, now, still) {
  ctx.fillStyle = C.blood;
  for (const [dx, dy] of [[-6, -2], [-1, -3], [4, -2], [1, -1]]) ctx.fillRect(p.x + dx, p.y + dy, 3, 2);
  ctx.fillStyle = C.muted;
  for (let k = 0; k < 4; k++) {
    const t = still ? k / 4 : (now / 2400 + k / 4) % 1;
    ctx.globalAlpha = 0.5 * (1 - t);
    ctx.fillRect(p.x - 2 + Math.sin(t * 5 + k) * 4, p.y - 6 - t * 34, 4, 3);
  }
  ctx.globalAlpha = 1;
}

export function drawFire(ctx, now, still, lit) {
  const p = iso(FIRE.x, FIRE.y);
  if (!lit) { drawEmbers(ctx, p, now, still); return; }
  for (let k = 0; k < 4; k++) {
    const h = still ? 12 : 9 + Math.sin(now / 80 + k * 1.7) * 4;
    ctx.fillStyle = k % 2 ? C.flameDeep : C.flame;
    ctx.fillRect(p.x - 8 + k * 4, p.y - 2 - h, 4, h);
  }
  ctx.fillStyle = C.flameCore;
  ctx.fillRect(p.x - 1.5, p.y - 8, 3, 5);
  if (still) return;
  // Sparks follow fixed paths, so the fire breathes without random flashing
  for (let k = 0; k < 6; k++) {
    const t = (now / 1400 + k / 6) % 1;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = k % 2 ? C.flameCore : C.flame;
    ctx.fillRect(p.x + (k - 2.5) * 2 + Math.sin(t * 6 + k * 2.1) * 6, p.y - 10 - t * 40, 1, 1);
  }
  ctx.globalAlpha = 1;
}
