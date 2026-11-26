import { FIRE } from '../layout.js';
import { iso, TW } from '../projection.js';

const TAU = Math.PI * 2;

function poly(ctx, pts, fill) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

// A box b = { x, y, w, h, z, z0 } from height z0 (the floor by default) up to z, with its top and the two faces the camera sees;
// detail paints over the faces before the fire lights them
export function prism(ctx, b, top, left, right, detail) {
  const { x, y, w, h, z, z0 = 0 } = b;
  const near = [iso(x, y + h, z0), iso(x + w, y + h, z0), iso(x + w, y + h, z), iso(x, y + h, z)],
    side = [iso(x + w, y, z0), iso(x + w, y + h, z0), iso(x + w, y + h, z), iso(x + w, y, z)];
  poly(ctx, near, left);
  poly(ctx, side, right);
  poly(ctx, [iso(x, y, z), iso(x + w, y, z), iso(x + w, y + h, z), iso(x, y + h, z)], top);
  detail?.(ctx);
  // The near face looks along +y and the side face along +x: whichever turns to the fire takes its light
  const dx = FIRE.x - (x + w / 2),
    dy = FIRE.y - (y + h / 2),
    dist = Math.hypot(dx, dy);
  if (dist < 0.5) return;
  const reach = Math.max(0, 1 - dist / 12);
  firelit(ctx, near, (dy / dist) * reach);
  firelit(ctx, side, (dx / dist) * reach);
}

// facing runs from -1, turned away from the fire, to 1, square to it
function firelit(ctx, face, facing) {
  ctx.globalAlpha = Math.abs(facing) * (facing > 0 ? 0.22 : 0.4);
  poly(ctx, face, facing > 0 ? 'rgb(255, 180, 110)' : 'rgb(0, 0, 0)');
  ctx.globalAlpha = 1;
}

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
