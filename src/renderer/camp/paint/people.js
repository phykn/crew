import { iso } from '../projection.js';
import { COLOR as C } from '../tokens.js';
import { TAU, shadow } from './shapes.js';
import { SEAT_Z } from './decor.js';
import { SEALS, SPRITE_W, SPRITE_H, spriteFor } from './sprites.js';

const BIG = 1.6;
// Feet pass each other between steps, so each leg gets its own frame
const STRIDE = ['stand', 'walkL', 'stand', 'walkR'];
// The sitting pose is the upper body only, resting on the plank
const UPPER = 18;
export const headTop = (p) => iso(p.x, p.y).y - (p.sitting ? SEAT_Z + UPPER * BIG - 2 : SPRITE_H * BIG);

// A worker casts wherever they stand once they stop walking
export const isCasting = (p) => p.state === 'working' && !p.path.length && !p.sitting;

function poseOf(p, now, still) {
  if (p.sitting) return 'sit';
  if (isCasting(p)) return SEALS[still ? 0 : Math.floor(now / 500) % SEALS.length];
  return p.moving ? STRIDE[Math.floor(now / 150) % STRIDE.length] : 'stand';
}

export function drawPerson(ctx, p, now, still) {
  const f = iso(p.x, p.y);
  if (!p.sitting) shadow(ctx, p.x, p.y, 12, 4);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // Someone with nothing to do fades a little, so the eye finds who is at work
  ctx.globalAlpha = p.state === 'idle' ? 0.85 : 1;
  ctx.translate(Math.round(f.x), Math.round(headTop(p)));
  if (p.facing < 0) ctx.scale(-1, 1);
  ctx.drawImage(spriteFor(p.room, poseOf(p, now, still)), (-SPRITE_W * BIG) / 2, 0, SPRITE_W * BIG, SPRITE_H * BIG);
  ctx.restore();
}

// Work is a spell cast on the ground: a rune ring turns at the feet, sends out a pulse every two seconds,
// and sheds motes that rise a little and fade, so nothing above the head moves and the name stays where it is
export function drawSpell(ctx, p, now, still) {
  const f = iso(p.x, p.y),
    rx = 16,
    ry = 6;
  const spin = still ? 0 : now / 900,
    pulse = still ? 1 : 0.75 + 0.25 * Math.sin(now / 180);
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
  if (!still) {
    const t = (now % 2000) / 2000,
      r = rx + t * 14;
    ctx.globalAlpha = 0.6 * (1 - t);
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, r, (r * ry) / rx, 0, 0, TAU);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const t = still ? (i + 0.5) / 8 : (now / 1600 + i / 8) % 1,
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
export function drawSeal(ctx, p, now, still) {
  const f = iso(p.x, p.y),
    y = headTop(p) + 11.5 * BIG;
  ctx.save();
  ctx.fillStyle = C.spellCore;
  ctx.shadowColor = C.spell;
  ctx.shadowBlur = 10;
  ctx.globalAlpha = still ? 0.8 : 0.55 + 0.35 * Math.sin(now / 160);
  ctx.fillRect(Math.round(f.x) - 1, Math.round(y) - 1, 3, 3);
  ctx.restore();
}
