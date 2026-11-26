import { iso, TW } from '../projection.js';

const TAU = Math.PI * 2;

// The soft dark spot where a thing meets the ground; with a height, the thing also blocks light, which paints the
// shadows it casts (stage/light.ts); casters, when the context has a list, collects it
export function shadow(ctx, x, y, rx, ry, h = 0) {
  const p = iso(x, y);
  blot(ctx, p.x, p.y, rx * 0.85, ry * 0.9, 0.5, 0.7);
  if (h) cast(ctx, x, y, rx, h);
}

// Only the flames' long shadow, for a solid that lays its own spot on the ground
export function cast(ctx, x, y, rx, h) {
  ctx.casters?.push({ x, y, r: rx / TW, h });
}

// Only the flames' shadow along a long thing, for a solid that lays its own spot on the ground
export function longCast(ctx, x, y, w, h, height) {
  if (!ctx.casters) return;
  const long = w > h,
    n = Math.max(1, Math.round(Math.max(w, h) / 0.4)),
    r = Math.min(w, h) / 2 + 0.1;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    ctx.casters.push({ x: long ? x + w * t : x + w / 2, y: long ? y + h / 2 : y + h * t, r, h: height });
  }
}

// An oval that keeps its darkness out to core, a fraction of its radius, then fades to nothing at its edge
function blot(ctx, x, y, rx, ry, alpha, core) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
  g.addColorStop(core, `rgba(0, 0, 0, ${alpha * 0.8})`);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, TAU);
  ctx.fill();
  ctx.restore();
}
