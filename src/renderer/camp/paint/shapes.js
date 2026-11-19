import { iso } from '../projection.js';
import { FONT } from '../tokens.js';

export const TAU = Math.PI * 2;
export const font = (size, weight = 700) => `${weight} ${size}px ${FONT.base}`;

export function poly(ctx, pts, fill) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function oval(ctx, x, y, rx, ry, fill, end = TAU) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, end);
  ctx.fill();
}

// A box b = { x, y, w, h, z, z0 } from height z0 (the floor by default) up to z, with its top and the two faces the camera sees
export function prism(ctx, b, top, left, right) {
  const { x, y, w, h, z, z0 = 0 } = b;
  poly(ctx, [iso(x, y + h, z0), iso(x + w, y + h, z0), iso(x + w, y + h, z), iso(x, y + h, z)], left);
  poly(ctx, [iso(x + w, y, z0), iso(x + w, y + h, z0), iso(x + w, y + h, z), iso(x + w, y, z)], right);
  poly(ctx, [iso(x, y, z), iso(x + w, y, z), iso(x + w, y + h, z), iso(x, y + h, z)], top);
}

export function shadow(ctx, x, y, rx, ry) {
  const p = iso(x, y);
  oval(ctx, p.x, p.y, rx, ry, 'rgba(0, 0, 0, .35)');
}

// A soft dark edge keeps small text readable on both grass and firelight
export function label(ctx, text, x, y, fill) {
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0, 0, 0, .75)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}
