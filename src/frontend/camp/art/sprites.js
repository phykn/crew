import { COLOR as C } from '../palette.js';
import { outline, rim, upscale } from './finish.js';

const SPRITE_W = 16,
  SPRITE_H = 26;

const channels = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

function shade(hex, f) {
  const [r, g, b] = channels(hex).map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return `rgb(${r}, ${g}, ${b})`;
}

// The cloth is the person's color, muddied and darkened so the camp keeps its grim palette
const DIRT = [0x3a, 0x34, 0x28];
const mute = (hex) =>
  '#' +
  channels(hex)
    .map((v, i) =>
      Math.round((v * 0.6 + DIRT[i] * 0.4) * 0.8)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');
const HAIR = ['#2b1d12', '#4a3020', '#1b1714', '#6b5a3a', '#5a2e1c'];

// A person is one head (rows 0-8), one upper body with the arms (rows 9-17) and one lower body (rows 18-25),
// each picked by name in the employee's `look`; d paints pixels and carries the person's cloth and hair colors
function face(d) {
  d.rect(5, 3, 6, 6, C.skin);
  d.rect(8, 3, 3, 6, C.skin, 0.82);
  d.px(6, 5, C.eye);
  d.px(9, 5, C.eye);
  d.px(7, 7, C.skin, 0.7);
}

const HEADS = {
  hood(d) {
    face(d);
    d.rect(4, 0, 8, 3, d.cloth, 0.7);
    d.rect(3, 2, 2, 7, d.cloth, 0.6);
    d.rect(11, 2, 2, 7, d.cloth, 0.55);
    d.rect(5, 3, 6, 1, d.hair, 0.9);
  },
  hair(d) {
    face(d);
    d.rect(5, 1, 6, 2, d.hair);
    d.px(6, 0, d.hair, 0.9);
    d.px(9, 0, d.hair, 0.8);
    d.rect(4, 2, 1, 4, d.hair, 0.9);
    d.rect(11, 2, 1, 4, d.hair, 0.7);
    d.rect(5, 3, 6, 1, d.hair, 0.9);
  },
  helm(d) {
    face(d);
    d.rect(4, 0, 8, 4, C.iron, 1.15);
    d.rect(5, 0, 4, 1, C.iron, 1.6);
    d.rect(4, 4, 1, 4, C.iron, 0.9);
    d.rect(11, 4, 1, 4, C.iron, 0.75);
    d.rect(7, 4, 2, 3, C.iron, 1.3);
  },
  hat(d) {
    face(d);
    d.rect(6, 0, 4, 1, d.cloth, 0.75);
    d.px(10, 0, d.cloth, 0.6);
    d.rect(5, 1, 6, 1, d.cloth, 0.8);
    d.rect(2, 2, 12, 1, d.cloth, 0.55);
    d.rect(5, 3, 6, 1, d.hair, 0.9);
  },
  braids(d) {
    face(d);
    d.rect(5, 1, 6, 2, d.hair);
    d.rect(5, 3, 6, 1, d.hair, 0.9);
    d.rect(3, 2, 2, 9, d.hair, 0.85);
    d.rect(11, 2, 2, 9, d.hair, 0.7);
    d.px(3, 11, C.goldDim, 1.2);
    d.px(12, 11, C.goldDim, 1.1);
  },
};

// Arms hang at the sides, or bend in so the hands meet before the chest while casting, forming one of three seals:
// palms pressed upright, hands stacked flat, fingers laced
export const SEALS = ['cast', 'cast2', 'cast3'];
const HANDS = [
  (d) => {
    d.rect(7, 10, 2, 3, C.skin, 0.95);
    d.px(6, 12, C.skin, 0.8);
    d.px(9, 12, C.skin, 0.7);
  },
  (d) => {
    d.rect(6, 12, 4, 1, C.skin, 0.95);
    d.rect(6, 11, 4, 1, C.skin, 0.75);
  },
  (d) => {
    d.rect(7, 11, 2, 2, C.skin, 0.95);
    d.px(6, 11, C.skin, 0.75);
    d.px(9, 11, C.skin, 0.7);
    d.px(6, 12, C.skin, 0.85);
    d.px(9, 12, C.skin, 0.8);
  },
];

function arms(d, sleeve, wide = 2) {
  if (d.casting) {
    d.rect(2, 11, 2, 3, sleeve, 0.75);
    d.rect(12, 11, 2, 3, sleeve, 0.6);
    d.rect(4, 13, 3, 1, sleeve, 0.85);
    d.rect(9, 13, 3, 1, sleeve, 0.7);
    HANDS[SEALS.indexOf(d.pose)](d);
    return;
  }
  d.rect(4 - wide, 11, wide, 6, sleeve, 0.75);
  d.rect(12, 11, wide, 6, sleeve, 0.6);
  d.rect(2, 17, 2, 1, C.skin, 0.9);
  d.rect(12, 17, 2, 1, C.skin, 0.8);
}

const UPPERS = {
  tunic(d) {
    d.rect(5, 9, 6, 1, C.iron, 0.9);
    d.rect(2, 9, 3, 2, C.iron, 1.15);
    d.rect(11, 9, 3, 2, C.iron, 0.95);
    d.rect(2, 9, 3, 1, C.iron, 1.5);
    d.rect(4, 10, 8, 8, d.cloth);
    d.rect(4, 10, 2, 8, d.cloth, 1.2);
    d.rect(10, 10, 2, 8, d.cloth, 0.7);
    d.rect(4, 15, 8, 1, C.leather, 1.2);
    d.px(7, 15, C.goldDim, 1.3);
    d.px(8, 15, C.goldDim, 1.1);
    arms(d, d.cloth);
  },
  robe(d) {
    d.rect(4, 9, 8, 9, d.cloth);
    d.rect(4, 9, 2, 9, d.cloth, 1.2);
    d.rect(10, 9, 2, 9, d.cloth, 0.7);
    d.px(6, 9, C.goldDim, 1.3);
    d.px(9, 9, C.goldDim, 1.1);
    d.rect(7, 10, 2, 1, C.goldDim, 1.2);
    d.rect(4, 14, 8, 1, C.goldDim, 1.1);
    arms(d, d.cloth, 3);
  },
  armor(d) {
    d.rect(4, 10, 8, 8, d.cloth, 0.8);
    d.rect(4, 10, 8, 6, C.iron, 1.1);
    d.rect(5, 10, 2, 5, C.iron, 1.45);
    d.rect(7, 10, 2, 8, d.cloth, 1.05);
    d.rect(1, 9, 4, 3, C.iron, 1.25);
    d.rect(11, 9, 4, 3, C.iron, 0.95);
    d.rect(1, 9, 4, 1, C.iron, 1.6);
    d.rect(4, 15, 8, 1, C.leather, 1.2);
    arms(d, C.leather);
  },
  vest(d) {
    d.rect(6, 9, 4, 1, C.skin, 0.85);
    d.rect(4, 10, 8, 8, d.cloth, 1.05);
    d.rect(4, 10, 3, 7, C.leather, 1.35);
    d.rect(9, 10, 3, 7, C.leather, 1.1);
    for (let k = 0; k < 5; k++) d.px(5 + k, 10 + k, C.leather, 0.8);
    d.rect(4, 15, 8, 1, C.leather, 0.8);
    d.px(7, 15, C.iron, 1.4);
    arms(d, d.cloth);
    if (!d.casting) {
      d.rect(2, 15, 2, 2, C.skin, 0.85);
      d.rect(12, 15, 2, 2, C.skin, 0.75);
    }
  },
};

// A walking person lifts the left leg (l) and the right leg (r) in turn, a pixel each
const LOWERS = {
  boots(d) {
    for (let x = 3; x < 13; x++) d.px(x, 18 + (x % 3 === 0 ? 1 : 0), d.cloth, 0.65);
    d.rect(5, 19 - d.l, 2, 4, C.leather, 1.3);
    d.rect(9, 19 - d.r, 2, 4, C.leather, 1.1);
    d.rect(4, 23 - d.l, 3, 2, C.leather, 0.7);
    d.rect(9, 23 - d.r, 3, 2, C.leather, 0.6);
  },
  gown(d) {
    d.rect(4, 18, 8, 3, d.cloth, 0.9);
    d.rect(3, 21, 10, 3, d.cloth, 0.8);
    d.rect(3, 18, 2, 6, d.cloth, 1.05);
    d.rect(11, 18, 2, 6, d.cloth, 0.65);
    for (let x = 3; x < 13; x++) d.px(x, 24 - (x % 4 === 1 ? 1 : 0), d.cloth, 0.6);
    d.rect(5 - d.l, 24, 2, 1, C.leather, 0.8);
    d.rect(9 + d.r, 24, 2, 1, C.leather, 0.7);
  },
  greaves(d) {
    d.rect(4, 18, 8, 1, d.cloth, 0.65);
    d.rect(5, 19 - d.l, 2, 2, C.leather, 1.2);
    d.rect(9, 19 - d.r, 2, 2, C.leather, 1);
    d.rect(5, 21 - d.l, 2, 2, C.iron, 1.3);
    d.rect(9, 21 - d.r, 2, 2, C.iron, 1.05);
    d.rect(4, 23 - d.l, 3, 2, C.iron, 0.95);
    d.rect(9, 23 - d.r, 3, 2, C.iron, 0.8);
  },
  wraps(d) {
    for (let x = 3; x < 13; x++) d.px(x, 18 + (x % 3 === 1 ? 1 : 0), d.cloth, 0.65);
    d.rect(5, 19 - d.l, 2, 4, d.cloth, 0.7);
    d.rect(9, 19 - d.r, 2, 4, d.cloth, 0.6);
    for (const y of [19, 21]) {
      d.px(5, y - d.l, C.parchmentDeep, 0.6);
      d.px(10, y - d.r, C.parchmentDeep, 0.5);
    }
    d.rect(4, 23 - d.l, 3, 1, C.skin, 0.75);
    d.rect(9, 23 - d.r, 3, 1, C.skin, 0.65);
    d.rect(4, 24 - d.l, 3, 1, C.leather, 0.9);
    d.rect(9, 24 - d.r, 3, 1, C.leather, 0.8);
  },
};

// Seated on the ground, the hips sit at row 18 and the feet about four rows lower: the thighs come toward us as a lap,
// then short shins go down to feet on the ground, so a sitting person keeps their legs instead of ending at the waist
const lap = (d, color, f) => {
  d.rect(4, 18, 8, 2, color, f);
  d.rect(4, 18, 8, 1, color, f * 1.15);
};
const SEATED = {
  boots(d) {
    lap(d, d.cloth, 0.65);
    d.rect(5, 20, 2, 1, C.leather, 1.3);
    d.rect(9, 20, 2, 1, C.leather, 1.1);
    d.rect(4, 21, 3, 1, C.leather, 0.7);
    d.rect(9, 21, 3, 1, C.leather, 0.6);
  },
  gown(d) {
    lap(d, d.cloth, 0.9);
    d.rect(3, 20, 10, 1, d.cloth, 0.75);
    d.rect(5, 21, 2, 1, C.leather, 0.8);
    d.rect(9, 21, 2, 1, C.leather, 0.7);
  },
  greaves(d) {
    lap(d, d.cloth, 0.65);
    d.rect(5, 20, 2, 1, C.iron, 1.3);
    d.rect(9, 20, 2, 1, C.iron, 1.05);
    d.rect(4, 21, 3, 1, C.iron, 0.95);
    d.rect(9, 21, 3, 1, C.iron, 0.8);
  },
  wraps(d) {
    lap(d, d.cloth, 0.65);
    d.rect(5, 20, 2, 1, d.cloth, 0.7);
    d.rect(9, 20, 2, 1, d.cloth, 0.6);
    d.px(5, 20, C.parchmentDeep, 0.6);
    d.px(10, 20, C.parchmentDeep, 0.5);
    d.rect(4, 21, 3, 1, C.leather, 0.9);
    d.rect(9, 21, 3, 1, C.leather, 0.8);
  },
};

// Each pixel gets a little random darkening so the figure looks worn, not flat
function paint(room, pose, seed) {
  const c = Object.assign(document.createElement('canvas'), { width: SPRITE_W, height: SPRITE_H });
  const ctx = c.getContext('2d');
  let s = seed;
  const grit = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const px = (x, y, color, f = 1) => {
    ctx.fillStyle = shade(color, f * (0.86 + grit() * 0.14));
    ctx.fillRect(x, y, 1, 1);
  };
  const rect = (x0, y0, w, h, color, f) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) px(x, y, color, f);
  };
  const d = {
    px,
    rect,
    pose,
    cloth: mute(room.color),
    hair: HAIR[seed % HAIR.length],
    casting: SEALS.includes(pose),
    l: pose === 'walkL' ? 1 : 0,
    r: pose === 'walkR' ? 1 : 0,
  };
  const [head, upper, lower] = room.look;
  // Bottom to top, so long hair and hoods fall over the shoulders
  (pose === 'sit' ? SEATED : LOWERS)[lower](d);
  UPPERS[upper](d);
  HEADS[head](d);
  return c;
}

// Painted at 16x26 and finished at twice that: smoother slopes, a dark outline, and light along the top edges
export const SPRITE_SCALE = 2;
function finished(small) {
  const W = SPRITE_W * SPRITE_SCALE,
    H = SPRITE_H * SPRITE_SCALE,
    d = upscale(small.getContext('2d').getImageData(0, 0, SPRITE_W, SPRITE_H).data, SPRITE_W, SPRITE_H);
  rim(d, W, H);
  outline(d, W, H);
  const c = Object.assign(document.createElement('canvas'), { width: W, height: H });
  c.getContext('2d').putImageData(new ImageData(d, W, H), 0, 0);
  return c;
}

const cache = new Map();
// Sprites are painted once per person and pose, then only copied each frame
export function spriteFor(room, pose) {
  // Hair comes from the team, so renaming someone never changes how they look
  const key = [room.team, room.color, room.look, pose].join('|');
  if (!cache.has(key))
    cache.set(key, finished(paint(room, pose, 1 + [...room.team].reduce((a, ch) => a + ch.charCodeAt(0), 0))));
  return cache.get(key);
}

const lit = new Map();
// The same sprite with the fire on one side, side 1 being its right: that side takes the warm light and the other falls
// into shade; laid over the plain sprite as the fire is near, it lights a person from where the fire is
export function litFor(room, pose, side) {
  const base = spriteFor(room, pose);
  if (!lit.has(base)) lit.set(base, new Map());
  const sides = lit.get(base);
  if (!sides.has(side)) {
    const c = Object.assign(document.createElement('canvas'), { width: base.width, height: base.height }),
      d = c.getContext('2d'),
      g = d.createLinearGradient(side > 0 ? c.width : 0, 0, side > 0 ? 0 : c.width, 0);
    d.drawImage(base, 0, 0);
    d.globalCompositeOperation = 'source-atop';
    g.addColorStop(0, 'rgba(255, 170, 95, 0.45)');
    g.addColorStop(0.45, 'rgba(255, 170, 95, 0)');
    g.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
    d.fillStyle = g;
    d.fillRect(0, 0, c.width, c.height);
    sides.set(side, c);
  }
  return sides.get(side);
}
