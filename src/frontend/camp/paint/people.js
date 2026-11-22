import { FIRE } from '../layout.js';
import { iso } from '../projection.js';
import { COLOR as C } from '../tokens.js';
import { TAU, shadow } from './shapes.js';
import { SEAT_Z } from './decor.js';
import { SEALS, SPRITE_W, SPRITE_H, spriteFor } from './sprites.js';

export const BIG = 1.6;
// Feet pass each other between steps, so each leg gets its own frame
const STRIDE = ['stand', 'walkL', 'stand', 'walkR'];
// The sitting pose is the upper body only, resting on the plank
const UPPER = 18;
export const headTop = (p) => iso(p.x, p.y).y - (p.sitting ? SEAT_Z + UPPER * BIG - 2 : SPRITE_H * BIG);

// A worker casts wherever they stand once they stop walking
export const isCasting = (p) => p.state === 'working' && !p.path.length && !p.sitting;

function poseOf(p, now) {
  if (p.sitting) return 'sit';
  if (isCasting(p)) return SEALS[Math.floor(now / 500) % SEALS.length];
  return p.moving ? STRIDE[Math.floor(now / 150) % STRIDE.length] : 'stand';
}

export function drawPerson(ctx, p, now) {
  const f = iso(p.x, p.y);
  if (!p.sitting) shadow(ctx, p.x, p.y, 12, 4);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // Someone with nothing to do fades a little, so the eye finds who is at work
  ctx.globalAlpha = p.state === 'idle' ? 0.85 : 1;
  ctx.translate(Math.round(f.x), Math.round(headTop(p)));
  ctx.drawImage(
    firelit(p, f, spriteFor(p.room, poseOf(p, now))),
    (-SPRITE_W * BIG) / 2,
    0,
    SPRITE_W * BIG,
    SPRITE_H * BIG,
  );
  ctx.restore();
}

let lit = null;
// The side of a person turned to the fire takes its warm light and the other side falls into shade, pixel column by
// pixel column, fading with distance from the fire; the facing flip is done here, so the light stays on the fire's side
function firelit(p, f, sprite) {
  lit ??= Object.assign(document.createElement('canvas'), { width: SPRITE_W, height: SPRITE_H });
  const d = lit.getContext('2d'),
    toward = Math.sign(iso(FIRE.x, FIRE.y).x - f.x) || 1,
    strength = Math.max(0, 1 - Math.hypot(p.x - FIRE.x, p.y - FIRE.y) / 10);
  d.setTransform(1, 0, 0, 1, 0, 0);
  d.globalCompositeOperation = 'copy';
  if (p.facing < 0) d.setTransform(-1, 0, 0, 1, SPRITE_W, 0);
  d.drawImage(sprite, 0, 0);
  d.setTransform(1, 0, 0, 1, 0, 0);
  d.globalCompositeOperation = 'source-atop';
  const g = d.createLinearGradient(toward > 0 ? SPRITE_W : 0, 0, toward > 0 ? 0 : SPRITE_W, 0);
  g.addColorStop(0, `rgba(255, 170, 95, ${0.45 * strength})`);
  g.addColorStop(0.45, 'rgba(255, 170, 95, 0)');
  g.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
  g.addColorStop(1, `rgba(0, 0, 0, ${0.3 * strength})`);
  d.fillStyle = g;
  d.fillRect(0, 0, SPRITE_W, SPRITE_H);
  return lit;
}

// Work is a spell cast on the ground: a rune ring turns at the feet, sends out a pulse every two seconds,
// and sheds motes that rise a little and fade, so nothing above the head moves and the name stays where it is
export function drawSpell(ctx, p, now) {
  const f = iso(p.x, p.y),
    rx = 16,
    ry = 6;
  const spin = now / 900,
    pulse = 0.75 + 0.25 * Math.sin(now / 180);
  ctx.save();
  ctx.fillStyle = ctx.strokeStyle = ctx.shadowColor = C.spell;
  ctx.shadowBlur = 6;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.7 * pulse;
  ctx.beginPath();
  ctx.ellipse(f.x, f.y, rx, ry, 0, 0, TAU);
  ctx.stroke();
  for (let k = 0; k < 6; k++) {
    const a = -spin + (k * TAU) / 6;
    ctx.fillRect(f.x + Math.cos(a) * rx - 1, f.y + Math.sin(a) * ry - 1, 2, 2);
  }
  const t = (now % 2000) / 2000,
    r = rx + t * 14;
  ctx.globalAlpha = 0.6 * (1 - t);
  ctx.beginPath();
  ctx.ellipse(f.x, f.y, r, (r * ry) / rx, 0, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const t = (now / 1600 + i / 8) % 1,
      a = (i * TAU) / 8 + spin;
    ctx.globalAlpha = 0.8 * (1 - t);
    ctx.fillRect(
      Math.round(f.x + Math.cos(a) * rx * (1 - t * 0.3)) - 1,
      Math.round(f.y + Math.sin(a) * ry - t * 12) - 1,
      2,
      2,
    );
  }
  ctx.restore();
}

// The seal glows where the hands meet; painted over the caster, since the hands are in front of them
export function drawSeal(ctx, p, now) {
  const f = iso(p.x, p.y),
    y = headTop(p) + 11.5 * BIG;
  ctx.save();
  ctx.fillStyle = C.spellCore;
  ctx.shadowColor = C.spell;
  ctx.shadowBlur = 10;
  ctx.globalAlpha = 0.55 + 0.35 * Math.sin(now / 160);
  ctx.fillRect(Math.round(f.x) - 1, Math.round(y) - 1, 3, 3);
  ctx.restore();
}
