import { BlurFilter, Container, Graphics, Matrix, type Renderer, RenderTexture, Sprite, Texture } from 'pixi.js';
import { FIRE, LANTERNS, TORCHES } from '../layout.js';
import { iso, TH, TW } from '../projection.js';
import { BIG, FIGURE, isCasting } from '../figure.js';
import { textureOf } from './bake';

export type Caster = { x: number; y: number; r: number; h: number };
type Person = { x: number; y: number; state: string | null; path: unknown[]; sitting?: boolean };
export type Box = { w: number; h: number; scale: number; ox: number; oy: number; dpr: number };

// Light and shade are soft gradients, so half the screen resolution looks the same and costs far less
const LIGHT_SCALE = 0.5;
// What the night leaves lit with no fire at all
const NIGHT = 'rgb(38, 42, 66)';
// A pool of light lies on the ground, so it is flattened like the ground; a round one reads as a spotlight
const SQUASH = 0.62;
type Light = { x: number; y: number; z: number; reach: number; rgb: number; blocks: boolean };
const LIGHTS: Light[] = [
  { ...FIRE, z: 14, reach: 430, rgb: 0xffc482, blocks: true },
  ...TORCHES.map((t: { x: number; y: number }) => ({ ...t, z: 30, reach: 170, rgb: 0xffaa64, blocks: true })),
  ...LANTERNS.map((l: { x: number; y: number }) => ({ ...l, z: 13, reach: 100, rgb: 0xffb069, blocks: false })),
];
// A person blocks light like a post as tall as their sprite is drawn
const PERSON = { r: 0.3, h: BIG * FIGURE.h };

// Burning light sways a little, each flame on its own beat; random changes every frame made the screen flash
export const flicker = (now: number, i: number) =>
  1 + 0.05 * Math.sin(now / 470 + i * 1.9) + 0.025 * Math.sin(now / 190 + i * 0.7);

// Light thins out with distance, like a real flame: bright close by, then a long fade with no edge to see
const falloff = (x: number) => Math.max(0, (1 / (1 + 12 * x * x) - 1 / 13) / (1 - 1 / 13));

// White gradients made once; tinted and stretched, they become every pool, glow, and shadow
function radial(stops: [number, number][], size = 256) {
  const c = Object.assign(document.createElement('canvas'), { width: size, height: size }),
    d = c.getContext('2d')!,
    g = d.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [at, a] of stops) g.addColorStop(at, `rgba(255, 255, 255, ${a})`);
  d.fillStyle = g;
  d.fillRect(0, 0, size, size);
  return textureOf(c);
}
let made: { pool: Texture; glow: Texture; blot: Map<number, Texture> } | null = null;
function textures() {
  made ??= {
    pool: radial([...Array(17)].map((_, i) => [i / 16, falloff(i / 16)] as [number, number])),
    glow: radial([
      [0, 1],
      [1, 0],
    ]),
    blot: new Map(),
  };
  return made;
}
// A soft round spot, full in the middle and gone at its edge
export const glowTexture = () => textures().glow;

// An oval that keeps its darkness out to core, a fraction of its radius, then fades to nothing at its edge
export function blotTexture(core: number) {
  const t = textures();
  if (!t.blot.has(core))
    t.blot.set(
      core,
      radial([
        [0, 1],
        [core, 0.8],
        [1, 0],
      ]),
    );
  return t.blot.get(core)!;
}

// One cast shadow: a soft blot lying flat on the ground, pointing away from its light
class Cast {
  ground = new Container();
  turn = new Container();
  blot = new Sprite(blotTexture(0.35));
  constructor(layer: Container) {
    this.blot.anchor.set(0.5);
    this.blot.tint = 0x000000;
    this.turn.addChild(this.blot);
    this.ground.addChild(this.turn);
    layer.addChild(this.ground);
  }
  // Longer the farther the caster stands and the lower the light burns, darkest at the caster's feet; sway turns it
  place(light: Light, c: Caster, sway: number) {
    const dx = c.x - light.x,
      dy = c.y - light.y,
      dist = Math.hypot(dx, dy);
    // Right at the light, such as the stones round the fire, nothing stands between it and the ground
    if (dist < 0.6 || dist > light.reach / TW) return (this.ground.visible = false);
    const length = Math.min(4, Math.max(0.5, (dist * c.h) / (light.z * 1.8))) * (1 + sway),
      base = iso(c.x, c.y),
      lit = iso(light.x, light.y);
    this.ground.visible = true;
    this.ground.setFromMatrix(new Matrix(TW / 2, TH / 2, -TW / 2, TH / 2, base.x, base.y));
    this.turn.rotation = Math.atan2(dy, dx) + sway;
    this.blot.position.set(length * 0.45, 0);
    this.blot.width = length * 1.2;
    this.blot.height = c.r * 2.6;
    // As dark as the light is strong where it falls
    this.blot.alpha = 0.9 * falloff(Math.hypot(base.x - lit.x, (base.y - lit.y) / SQUASH) / light.reach);
  }
}

// The light over the scene, and the shadows under everything that stands in it
export function createLight(renderer: Renderer, box: Box, casters: Caster[]) {
  const t = textures();
  // Shadows lie on the ground before anything stands on it, so they go under the pieces and never across them
  const shade = new Container();
  shade.filters = [new BlurFilter({ strength: 1.5 * box.scale, quality: 3 })];
  const blocking = LIGHTS.filter((l) => l.blocks);
  const still = blocking.map(() => casters.map(() => new Cast(shade)));
  const moving = new Map<object, Cast[]>();

  // The map: the night everywhere, each light added on top; the scene is multiplied by it
  const root = new Container(),
    night = new Graphics().rect(0, 0, box.w, box.h).fill(NIGHT),
    world = new Container();
  world.position.set(box.ox, box.oy);
  world.scale.set(box.scale);
  root.addChild(night, world);
  const pools = LIGHTS.map((l) => {
    const s = new Sprite(t.pool),
      p = iso(l.x, l.y);
    s.anchor.set(0.5);
    s.position.set(p.x, p.y);
    s.width = l.reach * 2;
    s.height = l.reach * 2 * SQUASH;
    s.tint = l.rgb;
    s.blendMode = 'add';
    world.addChild(s);
    return s;
  });
  const own = new Map<object, { self: Sprite; spell: Sprite }>();
  const pool = (rgb: number, alpha: number) => {
    const s = new Sprite(t.pool);
    s.anchor.set(0.5);
    s.tint = rgb;
    s.alpha = alpha;
    s.blendMode = 'add';
    world.addChild(s);
    return s;
  };
  const map = RenderTexture.create({ width: box.w, height: box.h, resolution: box.dpr * LIGHT_SCALE });
  const over = new Sprite(map);
  over.blendMode = 'multiply';

  // The warm haze of each flame, added after the scene so it glows instead of only tinting
  const haze = new Container();
  const glows = [
    ...TORCHES.map((tc: { x: number; y: number }, i: number) => ({
      p: iso(tc.x, tc.y, 30),
      r: 70,
      rgb: 0xff963c,
      a: 0.12,
      i: i + 1,
    })),
    { p: iso(FIRE.x, FIRE.y, 6), r: 120, rgb: 0xff8c32, a: 0.2, i: 0 },
  ].map((g) => {
    const s = new Sprite(t.glow);
    s.anchor.set(0.5);
    s.position.set(g.p.x, g.p.y);
    s.width = s.height = g.r * 2;
    s.tint = g.rgb;
    s.blendMode = 'add';
    haze.addChild(s);
    return { s, ...g };
  });

  function draw(now: number, people: Iterable<Person>) {
    const sways = blocking.map((_, i) => (flicker(now, LIGHTS.indexOf(blocking[i])) - 1) * 0.6);
    blocking.forEach((light, i) => casters.forEach((c, k) => still[i][k].place(light, c, sways[i])));
    const here = new Set<object>();
    for (const p of people) {
      here.add(p);
      let casts = moving.get(p);
      if (!casts) moving.set(p, (casts = blocking.map(() => new Cast(shade))));
      blocking.forEach((light, i) => casts![i].place(light, { x: p.x, y: p.y, ...PERSON }, sways[i]));
      let o = own.get(p);
      // A faint light of their own keeps everyone findable at the dark edge of the camp; a spell lights the ground blue
      if (!o) own.set(p, (o = { self: pool(0x787896, 0.35), spell: pool(0x7896ff, 0) }));
      const f = iso(p.x, p.y);
      o.self.position.set(f.x, f.y - 18);
      o.self.width = 96;
      o.self.height = 96 * SQUASH;
      o.spell.position.set(f.x, f.y);
      o.spell.width = 180;
      o.spell.height = 180 * SQUASH;
      o.spell.alpha = isCasting(p) ? 0.55 + 0.15 * Math.sin(now / 180) : 0;
    }
    // Someone who left takes their shadows and light with them
    for (const [p, casts] of moving)
      if (!here.has(p)) {
        casts.forEach((c) => c.ground.destroy({ children: true }));
        moving.delete(p);
        own.get(p)!.self.destroy();
        own.get(p)!.spell.destroy();
        own.delete(p);
      }
    pools.forEach((s, i) => (s.alpha = Math.min(1, flicker(now, i))));
    glows.forEach((g) => (g.s.alpha = g.a * flicker(now, g.i)));
    renderer.render({ container: root, target: map, clear: true });
  }

  return {
    shade,
    over,
    haze,
    draw,
    destroy() {
      root.destroy({ children: true });
      map.destroy(true);
    },
  };
}
