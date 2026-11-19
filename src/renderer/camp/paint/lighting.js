import { FIRE, LANTERNS, TORCHES } from '../layout.js';
import { iso } from '../projection.js';
import { isCasting } from './people.js';

// The darkness mask is all soft gradients, so a quarter of the screen resolution looks the same and costs far less
export const DARK_SCALE = 0.25;

function glow(ctx, p, radius, rgb, alpha) {
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
  g.addColorStop(0, `rgba(${rgb}, ${alpha})`);
  g.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = g;
  ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
}

export function drawGlow(ctx, people, now) {
  // A slow, small sway only; random per-frame changes made the whole screen flash
  const sway = 1 + 0.04 * Math.sin(now / 500) + 0.02 * Math.sin(now / 210);
  ctx.globalCompositeOperation = 'lighter';
  for (const t of TORCHES) glow(ctx, iso(t.x, t.y, 30), 80, '255, 150, 60', 0.16 * sway);
  for (const l of LANTERNS) glow(ctx, iso(l.x, l.y, 13), 50, '255, 170, 80', 0.14 * sway);
  glow(ctx, iso(FIRE.x, FIRE.y, 6), 130, '255, 140, 50', 0.26 * sway);
  // The rune ring under a caster lights the ground in cold blue, breathing with the spell
  const rune = (0.16 + 0.06 * Math.sin(now / 180)) * sway;
  for (const p of people.values()) if (isCasting(p)) glow(ctx, iso(p.x, p.y, 4), 60, '130, 165, 255', rune);
  ctx.globalCompositeOperation = 'source-over';
}

// True black everywhere except around what gives light: the fire, torches, lanterns, spells and the people themselves
export function drawDarkness(ctx, dark, view, people) {
  const d = dark.getContext('2d'),
    m = ctx.getTransform(),
    k = DARK_SCALE;
  d.setTransform(1, 0, 0, 1, 0, 0);
  d.clearRect(0, 0, dark.width, dark.height);
  d.setTransform(m.a * k, 0, 0, m.d * k, m.e * k, m.f * k);
  d.fillStyle = 'rgba(0, 0, 0, .78)';
  d.fillRect(view.x, view.y, view.w, view.h);
  d.globalCompositeOperation = 'destination-out';
  const open = (p, radius, strength) => {
    const g = d.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
    g.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
    g.addColorStop(0.55, `rgba(0, 0, 0, ${strength * 0.6})`);
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    d.fillStyle = g;
    d.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
  };
  open(iso(FIRE.x, FIRE.y), 230, 1);
  for (const t of TORCHES) open(iso(t.x, t.y, 20), 130, 0.9);
  for (const l of LANTERNS) open(iso(l.x, l.y, 13), 80, 0.8);
  for (const p of people.values()) {
    open(iso(p.x, p.y, 18), 48, 0.7);
    if (isCasting(p)) open(iso(p.x, p.y, 10), 80, 0.85);
  }
  d.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(dark, 0, 0, dark.width / k, dark.height / k);
  ctx.restore();
}
