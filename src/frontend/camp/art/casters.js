import { TW } from '../projection.js';

// A prop that stands in the flames' way blocks their light, which paints the long shadows it casts (stage/light.ts);
// the light probe's context carries the list they are collected in
export function cast(ctx, x, y, rx, h) {
  ctx.casters?.push({ x, y, r: rx / TW, h });
}

// A long thing, such as a bench or a log, blocks the flames along its whole length rather than at one point
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
