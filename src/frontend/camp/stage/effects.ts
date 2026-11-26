import { Container, Graphics, Sprite } from 'pixi.js';
import { FIRE, TORCHES } from '../layout.js';
import { iso } from '../projection.js';
import { COLOR as C } from '../palette.js';
import { glowTexture } from './light';

const hex = (c: string) => parseInt(c.slice(1), 16);
// The same number for the same spark and round, so each spark's flight differs from the last without random flashing
const hash = (k: number, round: number) => {
  const v = Math.sin(k * 127.1 + round * 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const SPARKS = 14;
// A flame tongue: wide at its base, bending to a point that sways
const tongue = (g: Graphics, x: number, y: number, half: number, h: number, sway: number, color: number) =>
  g
    .moveTo(x - half, y)
    .quadraticCurveTo(x - half * 0.6 + sway * 0.5, y - h * 0.55, x + sway, y - h)
    .quadraticCurveTo(x + half * 0.6 + sway * 0.5, y - h * 0.55, x + half, y)
    .closePath()
    .fill(color);
const PUFFS = 9;
// A thin pole still stands in the firelight, so it casts a long thin shadow
export const TORCH_CASTERS = TORCHES.map((t: { x: number; y: number }) => ({ x: t.x, y: t.y, r: 5 / 32, h: 30 }));

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
    smoke = new Container(),
    hearth = new Container();
  // Sparks burn brighter than what they fly past
  sparks.blendMode = 'add';
  const puffs = [...Array(PUFFS)].map(() => {
    const s = new Sprite(glowTexture());
    s.anchor.set(0.5);
    s.tint = 0x9a948c;
    smoke.addChild(s);
    return s;
  });
  hearth.zIndex = FIRE.x + FIRE.y;
  hearth.addChild(smoke, fire, sparks);
  items.addChild(hearth);
  const at = iso(FIRE.x, FIRE.y);

  return function draw(now: number) {
    torches.forEach(({ p, flame }: { p: { x: number; y: number }; flame: Graphics }, i: number) => {
      const h = 7 + Math.sin(now / 90 + i * 1.3) * 2,
        sway = Math.sin(now / 130 + i * 2.1) * 1.2;
      flame.clear();
      tongue(flame, p.x, p.y - 31, 3.2, h, sway, hex(C.flameDeep));
      tongue(flame, p.x, p.y - 31, 2, h * 0.7, sway * 0.7, hex(C.flame));
      tongue(flame, p.x, p.y - 31, 1, h * 0.35, sway * 0.4, hex(C.flameCore));
    });
    // Four bars rising and falling on their own beats, like a fire seen in pixels
    fire.clear();
    for (let k = 0; k < 4; k++) {
      const h = 9 + Math.sin(now / 80 + k * 1.7) * 4;
      fire.rect(at.x - 8 + k * 4, at.y - 2 - h, 4, h).fill(hex(k % 2 ? C.flameDeep : C.flame));
    }
    fire.rect(at.x - 1.5, at.y - 8, 3, 5).fill(hex(C.flameCore));
    // Each spark rises on its own path and lifetime, drifting sideways on the heat, and dims as it cools
    sparks.clear();
    for (let k = 0; k < SPARKS; k++) {
      const life = 900 + hash(k, 0) * 900,
        clock = now + k * 911,
        round = Math.floor(clock / life),
        t = (clock % life) / life,
        drift = (hash(k, round) - 0.5) * 22,
        rise = 30 + hash(k, round + 0.5) * 30;
      sparks
        .rect(at.x + drift * t + Math.sin(t * 7 + k) * 3, at.y - 8 - t * rise, 1, 1)
        .fill({ color: hex(k % 3 ? C.flame : C.flameCore), alpha: (1 - t) * (1 - t) });
    }
    // Smoke grows and thins as it rises, leaning one way and then the other
    puffs.forEach((s, k) => {
      const t = ((now / 4200 + k / PUFFS) % 1) + 0.0001;
      s.position.set(at.x + Math.sin(now / 1700 + k) * 4 + t * 10 * Math.sin(now / 5300), at.y - 14 - t * 70);
      s.width = s.height = 8 + t * 30;
      s.alpha = 0.22 * Math.sin(Math.PI * t);
    });
  };
}
