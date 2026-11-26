import { Container, Graphics } from 'pixi.js';
import { FIRE, TORCHES } from '../layout.js';
import { iso } from '../projection.js';
import { COLOR as C } from '../palette.js';

const hex = (c: string) => parseInt(c.slice(1), 16);
const TAU = Math.PI * 2;
// The same number for the same spark and round, so each spark's flight differs from the last without random flashing
const hash = (k: number, round: number) => {
  const v = Math.sin(k * 127.1 + round * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
// Every effect is drawn in whole scene units, so its edges step like the props' pixels
const px = (g: Graphics, x: number, y: number, w: number, h: number, color: string, alpha = 1) =>
  g.rect(Math.round(x), Math.round(y), w, h).fill({ color: hex(color), alpha });

// A thin pole still stands in the firelight, so it casts a long thin shadow
export const TORCH_CASTERS = TORCHES.map((t: { x: number; y: number }) => ({ x: t.x, y: t.y, r: 5 / 32, h: 30 }));

// Four broad tongues, each two pixels wide at its top and stepping down three rows a column so a notch parts it from the next, each rising and falling on its own slow beat, so the tallest wanders across the fire
const TONGUES = [
  { c: -4.5, h: 7, rate: 230, phase: 0 },
  { c: -1.5, h: 11, rate: 270, phase: 2.1 },
  { c: 1.5, h: 9, rate: 250, phase: 4.2 },
  { c: 4.5, h: 7.5, rate: 210, phase: 1.3 },
];
const HALF = 7;
const CORE = [1, 2, 3, 2, 1];

function drawFire(g: Graphics, x0: number, base: number, now: number) {
  const heights = new Map<number, number>();
  for (let x = -HALF; x <= HALF; x++) {
    let h = 2;
    for (const t of TONGUES) {
      const top = t.h + 3 * Math.sin(now / t.rate + t.phase);
      h = Math.max(h, top - 3 * (Math.abs(x - t.c) - 0.5));
    }
    heights.set(x, Math.floor(h));
  }
  const at = (x: number) => heights.get(x) ?? 0;
  for (let x = -HALF; x <= HALF; x++) {
    const h = at(x),
      edge = Math.abs(x) === HALF;
    // The bottom row is a pixel narrower each side, so the fire sits on the hearth rather than on a ruler
    px(g, x0 + x, base - h, 1, edge ? h - 1 : h, C.flameDeep);
    if (Math.abs(x) >= HALF - 1) px(g, x0 + x, base - (edge ? 3 : 2), 1, 2, C.flameDark);
  }
  for (let x = -HALF + 1; x <= HALF - 1; x++) {
    const inner = Math.min(at(x - 1), at(x), at(x + 1)) - 3;
    if (inner > 0) px(g, x0 + x, base - 1 - inner, 1, inner, C.flame);
  }
  const lift = Math.sin(now / 230) > 0.3 ? 1 : 0;
  CORE.forEach((h, i) => {
    const x = i - 2,
      tall = Math.min(h + (x === 0 ? lift : 0), Math.min(at(x - 1), at(x), at(x + 1)) - 1);
    if (tall > 0) px(g, x0 + x, base - tall, 1, tall, C.flameCore);
  });
}

// A teardrop on the cup: narrow at its root, widest low down, stepping in to a tip that leans on a slow beat
function drawTorch(g: Graphics, x0: number, root: number, now: number, i: number) {
  const h = Math.round(10 + 1.5 * Math.sin(now / 210 + i * 1.3)),
    sway = 1.6 * Math.sin(now / 330 + i * 2.1);
  for (let r = 0; r < h; r++) {
    const u = r / (h - 1),
      half = u < 0.3 ? 2 + u / 0.3 : 3 * Math.pow(1 - (u - 0.3) / 0.7, 0.7),
      outer = Math.round(half),
      inner = r < Math.round(h * 0.72) ? outer - 1 : -1,
      core = r < 2 ? 1 : r < 3 ? 0 : -1,
      x = x0 + Math.round(sway * u * u),
      y = root - 1 - r;
    px(g, x - outer, y, outer * 2 + 1, 1, C.flameDeep);
    if (inner >= 0) px(g, x - inner, y, inner * 2 + 1, 1, C.flame);
    if (core >= 0 && core < inner) px(g, x - core, y, core * 2 + 1, 1, C.flameCore);
  }
}

// An ember shrinks and cools through four stages: pale, amber, orange, and a faint deep orange
const EMBER = [
  { w: 2, h: 2, color: C.flameCore, alpha: 1, until: 0.15 },
  { w: 2, h: 2, color: C.flame, alpha: 1, until: 0.45 },
  { w: 1, h: 2, color: C.flameDeep, alpha: 0.9, until: 0.75 },
  { w: 1, h: 1, color: C.flameDark, alpha: 0.55, until: 1 },
];
const SPARKS = 6;

function drawSparks(g: Graphics, x0: number, y0: number, now: number) {
  for (let k = 0; k < SPARKS; k++) {
    const life = 1400 + hash(k, 0) * 800,
      clock = now + k * 911,
      round = Math.floor(clock / life),
      t = (clock % life) / life,
      drift = (hash(k, round) - 0.5) * 16,
      rise = 26 + hash(k, round + 0.5) * 20,
      e = EMBER.find((s) => t < s.until) ?? EMBER[3];
    px(g, x0 + drift * t + Math.sin(t * 3 + k), y0 - t * rise, e.w, e.h, e.color, e.alpha);
  }
}

// One wisp of two-row blocks whose bend travels upward, fading with height in slow bands, so puffs seem to part at the top
const BLOCKS = 20;

function drawSmoke(g: Graphics, x0: number, root: number, now: number) {
  const lean = 2 * Math.sin(now / 6000);
  for (let j = 0; j < BLOCKS; j++) {
    const s = j / (BLOCKS - 1),
      w = 2 + Math.floor(s * 2.5),
      off = (1 + 3 * s) * Math.sin(s * 5.5 - now / 900) + lean * s,
      band = 0.55 + 0.45 * Math.max(0, Math.sin(s * 9 - now / 650)),
      alpha = 0.42 * Math.pow(1 - s, 1.1) * Math.min(1, (j + 1) / 3) * band;
    px(g, x0 + off - w / 2, root - 2 * j - 2, w, 2, s < 0.45 ? C.smoke : C.smokeLight, alpha);
  }
}

// The flames: each torch and the fire are redrawn every frame, sorted among the pieces by where they stand; a torch's
// flame sits just in front of its baked pole
export function createFlames(items: Container) {
  const torches = TORCHES.map((t: { x: number; y: number }) => {
    const p = iso(t.x, t.y),
      flame = new Graphics();
    flame.zIndex = t.x + t.y + 0.01;
    items.addChild(flame);
    return { p, flame };
  });
  const fire = new Graphics(),
    sparks = new Graphics(),
    smoke = new Graphics(),
    hearth = new Container();
  hearth.zIndex = FIRE.x + FIRE.y;
  hearth.addChild(smoke, fire, sparks);
  items.addChild(hearth);
  const at = iso(FIRE.x, FIRE.y),
    x0 = Math.round(at.x),
    base = Math.round(at.y - 2);

  return function draw(now: number) {
    torches.forEach(({ p, flame }: { p: { x: number; y: number }; flame: Graphics }, i: number) => {
      flame.clear();
      drawTorch(flame, Math.round(p.x), Math.round(p.y - 31), now, i);
    });
    fire.clear();
    drawFire(fire, x0, base, now);
    sparks.clear();
    drawSparks(sparks, x0, base - 8, now);
    smoke.clear();
    drawSmoke(smoke, x0, base - 11, now);
  };
}

// A stepped one-pixel ellipse on the ground, plotted once per whole-unit point
function ring(g: Graphics, cx: number, cy: number, rx: number, ry: number, color: string, alpha: number) {
  const seen = new Set<string>();
  for (let a = 0; a < TAU; a += 1 / (rx * 3)) {
    const x = Math.round(cx + Math.cos(a) * rx),
      y = Math.round(cy + Math.sin(a) * ry);
    if (seen.has(`${x},${y}`)) continue;
    seen.add(`${x},${y}`);
    px(g, x, y, 1, 1, color, alpha);
  }
}
// Rays stand at the ring's sides, where they read as rising rather than crossing the caster
const RAYS = [3.0, 3.55, -0.25, 0.25];
const GLINTS = 5;

// Work is a ward cast on the ground: a teal ring round a gold one whose nodes turn slowly, a faint ivory ring inside,
// rays that rise and fade at its sides, and glints that drift up, so nothing above the head moves
export function drawWard(g: Graphics, f: { x: number; y: number }, now: number) {
  const cx = Math.round(f.x),
    cy = Math.round(f.y);
  ring(g, cx, cy, 16, 8, C.ward, 0.85);
  ring(g, cx, cy, 12, 6, C.wardGold, 0.75);
  ring(g, cx, cy, 7, 3.5, C.wardLight, 0.4);
  for (let k = 0; k < 8; k++) {
    const a = (k * TAU) / 8 + now / 2400,
      x = Math.round(cx + Math.cos(a) * 12),
      y = Math.round(cy + Math.sin(a) * 6);
    px(g, x - 1, y, 3, 1, C.wardGold);
    px(g, x, y - 1, 1, 3, C.wardGold);
    px(g, x, y, 1, 1, C.wardLight);
  }
  RAYS.forEach((a, k) => {
    const x = cx + Math.cos(a) * 16,
      y = Math.round(cy + Math.sin(a) * 8),
      h = Math.round(4 + 6 * (0.5 + 0.5 * Math.sin(now / 600 + k * 1.9)));
    px(g, x, y - 1, 1, 1, C.wardGold, 0.9);
    for (let r = 1; r < h; r += 2) px(g, x, y - 1 - r - 1, 1, 2, C.wardLight, 0.8 * (1 - r / h));
  });
  for (let i = 0; i < GLINTS; i++) {
    const m = (now / 1800 + i / GLINTS) % 1,
      a = (i * TAU) / GLINTS + 0.7;
    px(g, cx + Math.cos(a) * 14, cy + Math.sin(a) * 7 - m * 14, 1, 1, C.wardLight, 0.9 * (1 - m));
  }
}
