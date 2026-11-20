import { FIRE, LANTERNS, TORCHES } from '../layout.js';
import { iso, TW, TH } from '../projection.js';
import { SPRITE_H } from './sprites.js';
import { isCasting } from './people.js';
import { blot } from './shapes.js';

// Light is all soft gradients and soft shadows, so half the screen resolution looks the same and costs far less
export const LIGHT_SCALE = 0.5;
// What the night leaves lit with no fire at all
const NIGHT = 'rgb(38, 42, 66)';
// A pool of light lies on the ground, so it is flattened like the ground; a round one reads as a spotlight
const SQUASH = 0.62;
// Each light: how high it burns, how far it reaches on screen, its color, and whether things block it
const LIGHTS = [
  { ...FIRE, z: 14, reach: 430, rgb: '255, 196, 130', blocks: true },
  ...TORCHES.map((t) => ({ ...t, z: 30, reach: 170, rgb: '255, 170, 100', blocks: true })),
  ...LANTERNS.map((l) => ({ ...l, z: 13, reach: 100, rgb: '255, 176, 105', blocks: false })),
];
// A person blocks light like a post as tall as their sprite
const PERSON = { r: 0.3, h: 2 * SPRITE_H };

// Burning light sways a little, each flame on its own beat; random changes every frame made the screen flash
const flicker = (now, i) => 1 + 0.05 * Math.sin(now / 470 + i * 1.9) + 0.025 * Math.sin(now / 190 + i * 0.7);

// Light thins out with distance, like a real flame: bright close by, then a long fade with no edge to see
function pool(d, p, reach, rgb, strength = 1) {
  d.save();
  d.translate(p.x, p.y);
  d.scale(1, SQUASH);
  const g = d.createRadialGradient(0, 0, 0, 0, 0, reach);
  for (let i = 0; i <= 8; i++) {
    const x = i / 8,
      f = (1 / (1 + 12 * x * x) - 1 / 13) / (1 - 1 / 13);
    g.addColorStop(x, `rgba(${rgb}, ${f * strength})`);
  }
  d.fillStyle = g;
  d.fillRect(-reach, -reach, reach * 2, reach * 2);
  d.restore();
}

// Where a caster keeps this light off the ground: a shade lying flat, pointing away from the light, longer the farther
// the caster stands and the lower the light burns, darkest at the caster's feet
function cut(d, light, c) {
  const dx = c.x - light.x,
    dy = c.y - light.y,
    dist = Math.hypot(dx, dy);
  // Right at the light, such as the stones round the fire, nothing stands between it and the ground
  if (dist < 0.6 || dist > light.reach / TW) return;
  const length = Math.min(4, Math.max(0.5, (dist * c.h) / (light.z * 1.8))),
    base = iso(c.x, c.y);
  d.save();
  d.transform(TW / 2, TH / 2, -TW / 2, TH / 2, base.x, base.y);
  d.rotate(Math.atan2(dy, dx));
  blot(d, length * 0.45, 0, length * 0.6, c.r * 1.3, 0.9, 0.35);
  d.restore();
}

// One layer per light, made once per view: its pool with the shadows of everything that never moves cut out
function paintLights(width, height, m, casters) {
  return LIGHTS.map((light) => {
    const layer = Object.assign(document.createElement('canvas'), { width, height });
    const d = layer.getContext('2d');
    d.setTransform(m);
    pool(d, iso(light.x, light.y), light.reach, light.rgb);
    if (light.blocks) {
      d.globalCompositeOperation = 'destination-out';
      for (const c of casters) cut(d, light, c);
    }
    return layer;
  });
}

// Light over the scene: the night everywhere, every light added on top, then the scene multiplied by it,
// so a shadow is simply where one light does not reach and another may still
export function createLighting(map, casters) {
  const d = map.getContext('2d'),
    scratch = Object.assign(document.createElement('canvas'), { width: map.width, height: map.height }),
    s = scratch.getContext('2d');
  let layers = null;

  return function drawLight(ctx, people, now) {
    const k = LIGHT_SCALE,
      t = ctx.getTransform(),
      m = new DOMMatrix([t.a * k, 0, 0, t.d * k, t.e * k, t.f * k]);
    layers ??= paintLights(map.width, map.height, m, casters);
    const walkers = [...people.values()].map((p) => ({ x: p.x, y: p.y, ...PERSON }));
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalCompositeOperation = 'source-over';
    d.globalAlpha = 1;
    d.fillStyle = NIGHT;
    d.fillRect(0, 0, map.width, map.height);
    d.globalCompositeOperation = 'lighter';
    LIGHTS.forEach((light, i) => {
      let layer = layers[i];
      // People move, so their shadows are cut from a copy of the light each frame, only for lights near them
      const near = light.blocks
        ? walkers.filter((c) => Math.hypot(c.x - light.x, c.y - light.y) < light.reach / TW)
        : [];
      if (near.length) {
        s.setTransform(1, 0, 0, 1, 0, 0);
        s.globalCompositeOperation = 'copy';
        s.drawImage(layer, 0, 0);
        s.globalCompositeOperation = 'destination-out';
        s.setTransform(m);
        for (const c of near) cut(s, light, c);
        layer = scratch;
      }
      d.globalAlpha = Math.min(1, flicker(now, i));
      d.drawImage(layer, 0, 0);
    });
    d.globalAlpha = 1;
    d.setTransform(m);
    for (const p of people.values()) {
      // A faint light of their own keeps everyone findable at the dark edge of the camp
      pool(d, iso(p.x, p.y, 18), 48, '120, 120, 150', 0.35);
      // The rune ring under a caster lights the ground in cold blue, breathing with the spell
      if (isCasting(p)) pool(d, iso(p.x, p.y), 90, '120, 150, 255', 0.55 + 0.15 * Math.sin(now / 180));
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(map, 0, 0, map.width / k, map.height / k);
    ctx.restore();
  };
}

// The warm haze of each flame, added after the scene so it glows instead of only tinting
export function drawGlow(ctx, now) {
  ctx.globalCompositeOperation = 'lighter';
  TORCHES.forEach((t, i) => glow(ctx, iso(t.x, t.y, 30), 70, '255, 150, 60', 0.12 * flicker(now, i + 1)));
  glow(ctx, iso(FIRE.x, FIRE.y, 6), 120, '255, 140, 50', 0.2 * flicker(now, 0));
  ctx.globalCompositeOperation = 'source-over';
}

function glow(ctx, p, radius, rgb, alpha) {
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
  g.addColorStop(0, `rgba(${rgb}, ${alpha})`);
  g.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = g;
  ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
}
