import { FIRE, TORCHES } from '../layout.js';
import { iso, TW } from '../projection.js';
import { COLOR as C } from '../palette.js';

// Props modelled as solids and drawn by casting a ray per pixel through the camp's own projection, so their shape,
// overlap, and light follow from the model rather than from strokes placed by hand

// One tile is 16 units, as long as 16 px of height, so a solid uses one unit on every axis
export const U = 16;

// Each material's shades from darkest to lightest; light picks 1 to 4, and details step down or up from there
export const WOOD = [C.barkDark, C.woodDeep, C.woodDark, C.wood, C.woodLight];
// Bark stays darker than the cut wood it wraps, so a log's end reads at a glance
export const BARK = [C.eye, C.barkDark, C.barkDark, C.bark, C.woodDeep];
export const ROCK = [C.eye, C.rockDeep, C.rockDark, C.rock, C.rockLight];
export const HAY = [C.woodDark, C.hayDeep, C.hayDark, C.hay, C.hayLight];
export const CANVAS = [C.leather, C.canvasDeep, C.canvasDark, C.canvas, C.parchmentDeep];
// Needles stay dark at night: the ramp starts and ends darker than the other materials'
export const LEAF = [C.leafDeep, C.leafDeep, C.leafDark, C.leaf, C.leafLight];
// A flame behind glass gives its own light, so its shades run from the deep orange to the white core
export const BLAZE = [C.flameDeep, C.flameDeep, C.flame, C.flame, C.flameCore];
// A doorway's dark inside, warmed by the lantern within
export const GLOW = [C.leather, C.leather, C.doorGlow, C.doorGlow, C.doorGlow];
// Still water is one dark color whichever way the light falls
export const WATER = [C.water, C.water, C.water, C.water, C.water];
export const IRON = [C.eye, C.leather, C.iron, C.muted, C.rockLight];

// Light from the upper left: tops are lightest, faces toward +y next, faces toward +x darkest
const LIGHT = (() => {
  const v = [0.1, 0.45, 0.88],
    n = Math.hypot(...v);
  return v.map((c) => c / n);
})();
const shade = (n) => {
  const lit = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2];
  return lit > 0.75 ? 4 : lit > 0.55 ? 3 : lit > 0.3 ? 2 : 1;
};

// The camp's big flames, as the light map places them (reach in screen px): a surface turned toward one near it is
// lit a step warmer (a lantern's small reach would only stamp a disc on a face); flicker and fall-off stay
// with the light map
const FLAMES = [{ ...FIRE, z: 14, reach: 430 }, ...TORCHES.map((t) => ({ ...t, z: 30, reach: 170 }))].map((f) => ({
  at: [f.x * U, f.y * U, f.z],
  reach: (f.reach / TW) * U,
}));
const FLAME = [0xff, 0x8c, 0x2e];
const warmth = (p, n, dist) => {
  let sum = 0;
  for (const f of FLAMES) {
    const v = [f.at[0] - p[0], f.at[1] - p[1], f.at[2] - p[2]],
      far = Math.hypot(...v);
    if (far >= f.reach || far < 1) continue;
    const facing = (n[0] * v[0] + n[1] * v[1] + n[2] * v[2]) / far,
      light = facing * (1 - far / f.reach) ** 2,
      u = v.map((c) => c / far);
    // Light too faint to show is not worth looking for what blocks it
    if (light > 0.02 && !blocked(p, n, u, far, dist)) sum += light;
  }
  return Math.min(1, sum);
};
// Whether a solid stands between p and a flame along u, such as the cup above a torch's pole or a wall
const blocked = (p, n, u, far, dist) => {
  for (let t = 0.6, k = 0; k < 32 && t < far - 1.5; k++) {
    const d = dist([p[0] + n[0] * 0.3 + u[0] * t, p[1] + n[1] * 0.3 + u[1] * t, p[2] + n[2] * 0.3 + u[2] * t]);
    if (d < 0.05) return true;
    t += Math.max(d, 0.3);
  }
  return false;
};

// How far p lies outside the box b ([[x, y, z], [x, y, z]]), or 0 inside it
const boxDistance = (p, b) => Math.hypot(...[0, 1, 2].map((a) => Math.max(b[0][a] - p[a], 0, p[a] - b[1][a])));

// The sky's light comes from behind the camp, so a solid's spot on the ground falls a little toward the viewer
const SKY = [-0.3, -0.3, 1].map((v) => v / Math.hypot(0.3, 0.3, 1));
// How dark the ground is at g: soft where the path toward the sky passes close to a solid, and darkest at its foot
const groundShade = (g, dist, far, lo, hi) => {
  // Only the stretch of the path to the sky that passes over the solids' box can be shaded
  const enter = Math.max(0.5, ...[0, 1].map((a) => (g[a] - hi[a]) / -SKY[a])),
    leave = Math.min(far, hi[2] / SKY[2], ...[0, 1].map((a) => (g[a] - lo[a]) / -SKY[a]));
  const near = [0, 1].every((a) => g[a] > lo[a] - 4 && g[a] < hi[a] + 4);
  if (enter > leave && !near) return 0;
  let open = 1;
  for (let t = Math.max(0.5, enter - 2), n = 0; n < 96 && t < Math.min(far, leave + 2); n++) {
    const d = dist([g[0] + SKY[0] * t, g[1] + SKY[1] * t, SKY[2] * t]),
      fade = (1 - t / far) ** 2;
    if (d < 0.02) return 0.6 * fade;
    open = Math.min(open, 1 - (1 - Math.min(1, (12 * d) / t)) * fade);
    t += Math.max(d, 0.4);
  }
  const foot = Math.max(0, 1 - dist([g[0], g[1], 1]) / 1.5);
  return 0.6 * Math.max(1 - Math.min(1, open), foot * 0.8);
};

// The ground point (in tiles) under a screen point, from the projection's own axes
const o = iso(0, 0, 0),
  ax = { x: iso(1, 0, 0).x - o.x, y: iso(1, 0, 0).y - o.y },
  ay = { x: iso(0, 1, 0).x - o.x, y: iso(0, 1, 0).y - o.y },
  det = ax.x * ay.y - ax.y * ay.x;
const ground = (sx, sy) => {
  const dx = sx - o.x,
    dy = sy - o.y;
  return [((dx * ay.y - dy * ay.x) / det) * U, ((ax.x * dy - ax.y * dx) / det) * U];
};

// Signed distances, in units, from a point to the plain solids props are built from
const len = (x, y, z = 0) => Math.hypot(x, y, z);
// A box of half sizes h, its edges rounded by r
export function box(c, h, r = 0) {
  return (p) => {
    const q = [0, 1, 2].map((a) => Math.abs(p[a] - c[a]) - h[a] + r);
    return len(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0)) + Math.min(Math.max(...q), 0) - r;
  };
}
// A cut stone: flat faces, one per direction, each set back to the oval of radii r it is cut from, and cut off at the
// ground; the far side of a face's distance is a lower bound, which keeps the march safe
export function facets(c, r, faces) {
  const planes = faces.map(([x, y, z, depth]) => {
    const n = Math.hypot(x, y, z),
      u = [x / n, y / n, z / n];
    // The oval's reach toward u, scaled by how deep this face is cut
    return [u, Math.hypot(u[0] * r[0], u[1] * r[1], u[2] * r[2]) * depth];
  });
  return (p) => {
    let d = -p[2];
    for (const [u, reach] of planes)
      d = Math.max(d, (p[0] - c[0]) * u[0] + (p[1] - c[1]) * u[1] + (p[2] - c[2]) * u[2] - reach);
    return d;
  };
}
// A round solid along axis (0, 1, or 2) whose radius may change along it: radius(t) for t from -1 to 1
export function round(c, axis, half, radius) {
  const [a, b] = [0, 1, 2].filter((k) => k !== axis);
  return (p) => {
    const along = p[axis] - c[axis],
      r = radius(Math.max(-1, Math.min(1, along / half))),
      d = [len(p[a] - c[a], p[b] - c[b]) - r, Math.abs(along) - half];
    // A radius that changes along the axis makes the distance a little long; the factor keeps the march safe
    return (len(Math.max(d[0], 0), Math.max(d[1], 0)) + Math.min(Math.max(d[0], d[1]), 0)) * 0.85;
  };
}

// A rod of radius r from a to b, for poles, ropes, and shafts: rounded at both ends, or cut flat like sawn wood
export function rod(a, b, r, flat = false) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    ll = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2,
    long = Math.sqrt(ll);
  return (p) => {
    const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]],
      along = (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / ll;
    if (!flat) {
      const t = Math.max(0, Math.min(1, along));
      return len(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t) - r;
    }
    const out = len(ap[0] - ab[0] * along, ap[1] - ab[1] * along, ap[2] - ab[2] * along) - r,
      past = (Math.abs(along - 0.5) - 0.5) * long;
    return Math.hypot(Math.max(out, 0), Math.max(past, 0)) + Math.min(Math.max(out, past), 0);
  };
}

// parts: [{ sdf, paint(p, n, light) -> [shades, step], glow }], bounds: [[x, y, z], [x, y, z]] in units; a part
// that glows casts no shadow
// Pictures already drawn, by scale and by name: a prop's own place, kept so a resize draws nothing again, or a look
// the caller shares between props, kept only while no flame touched it
const kept = new Map();
let place = null;
// Names the solids drawn inside draw by where they stand, which fixes how they look
export function inPlace(name, draw) {
  place = name;
  try {
    draw();
  } finally {
    place = null;
  }
}

// The picture kept for a prop's place at a scale, which a worker paints and hands to the window
export const pictureOf = (name, k) => kept.get(`${name}@${k}`);
export const keepPicture = (name, k, picture) => kept.set(`${name}@${k}`, picture);

// key, when given, names solids that look the same wherever they stand once out of the flames' reach
export function drawSolids(ctx, parts, bounds, key) {
  // The light probe only collects what blocks the flames
  if (ctx.casters) return;
  // The frame also holds the spot the solids lay on the ground, which reaches out away from the sky's light
  const top = bounds[1][2] + 2,
    reach = (top / SKY[2]) * Math.hypot(SKY[0], SKY[1]),
    margin = 4 + top / SKY[2] / 12,
    frame = [
      [bounds[0][0] - margin, bounds[0][1] - margin, 0],
      [bounds[1][0] + reach + margin, bounds[1][1] + reach + margin, bounds[1][2]],
    ];
  // Whole steps of scale, so a window resized a little draws from what is kept
  const k = Math.min(4, Math.ceil(ctx.getTransform().a - 0.05)),
    anchor = iso(bounds[0][0] / U, bounds[0][1] / U, 0),
    // A look shared between props holds only where no flame's light shows on any of the solids' box: past 0.86 of its
    // reach, (1 - d / reach)^2 is below the 0.02 that warmth counts
    unlit = FLAMES.every((f) => boxDistance(f.at, bounds) >= f.reach * 0.86),
    own = place && `${place}@${k}`,
    shared = key && unlit && `${key}@${k}`,
    again = (own && kept.get(own)) || (shared && kept.get(shared));
  if (again) {
    if (own) kept.set(own, again);
    ctx.drawImage(
      again.canvas,
      Math.round(anchor.x + again.dx),
      Math.round(anchor.y + again.dy),
      again.canvas.width / k,
      again.canvas.height / k,
    );
    return;
  }
  const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((n) =>
      iso(frame[n & 1][0] / U, frame[(n >> 1) & 1][1] / U, frame[n >> 2][2]),
    ),
    x0 = Math.floor(Math.min(...corners.map((p) => p.x))) - 1,
    y0 = Math.floor(Math.min(...corners.map((p) => p.y))) - 1,
    w = Math.ceil(Math.max(...corners.map((p) => p.x)) - x0) + 2,
    h = Math.ceil(Math.max(...corners.map((p) => p.y)) - y0) + 2,
    W = Math.ceil(w * k),
    H = Math.ceil(h * k);
  const warm = new Float32Array(W * H),
    depth = new Float32Array(W * H).fill(-Infinity),
    hits = Array.from({ length: W * H }),
    dark = new Float32Array(W * H),
    found = new Uint8Array(W * H);
  const scene = (p) => {
    let best = Infinity,
      part = null;
    for (const q of parts) {
      const d = q.sdf(p);
      if (d < best) [best, part] = [d, q];
    }
    return [best, part];
  };
  const solid = (p) => scene(p)[0],
    blocking = parts.filter((q) => !q.glow),
    blocks = (p) => {
      let best = Infinity;
      for (const q of blocking) best = Math.min(best, q.sdf(p));
      return best;
    };
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const [gx, gy] = ground(x0 + (i + 0.5) / k, y0 + (j + 0.5) / k);
      // Along the ray every unit up is also a unit toward +x and +y, so the point keeps its place on screen
      let hit = false;
      // A ray is marched only where it is inside the solids' box
      const from = Math.min(top, bounds[1][0] - gx, bounds[1][1] - gy) + 0.5,
        to = Math.max(-1, bounds[0][0] - gx, bounds[0][1] - gy) - 0.5;
      for (let s = from, n = 0; n < 120 && s > to; n++) {
        const p = [gx + s, gy + s, s],
          [d, part] = scene(p);
        if (d < 0.04) {
          const e = 0.05,
            g = [0, 1, 2].map((a) => {
              const hi = [...p],
                lo = [...p];
              hi[a] += e;
              lo[a] -= e;
              return part.sdf(hi) - part.sdf(lo);
            }),
            gl = Math.hypot(...g) || 1,
            nrm = g.map((v) => v / gl);
          depth[j * W + i] = s;
          if (!unlit) warm[j * W + i] = warmth(p, nrm, solid);
          hits[j * W + i] = part.paint(p, nrm, shade(nrm));
          hit = true;
          break;
        }
        // A step of s moves the point sqrt(3) units, so the distance divided by that never passes a surface
        s -= Math.max(d, 0.03) / Math.sqrt(3);
      }
      // The ground's shade is soft, so it is found on every other pixel each way and shared with the pixels beside it
      if (!hit) {
        const ei = i & ~1,
          ej = j & ~1,
          at = ej * W + ei;
        if (!found[at]) {
          const [ex, ey] = ground(x0 + (ei + 0.5) / k, y0 + (ej + 0.5) / k);
          dark[at] = groundShade([ex, ey, 0], blocks, top / SKY[2], bounds[0], bounds[1]);
          found[at] = 1;
        }
        dark[j * W + i] = dark[at];
      }
    }
  const img = new ImageData(W, H),
    rgb = {};
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const at = j * W + i,
        hit = hits[at];
      if (!hit) {
        if (dark[at] > 0.02) img.data.set([0, 0, 0, Math.round(dark[at] * 255)], at * 4);
        continue;
      }
      let [shades, step] = hit;
      // Where a nearer surface starts beside this one, this one falls a step into its shade, so solids stay apart
      const near = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([di, dj]) => {
        const ni = i + di,
          nj = j + dj;
        return ni >= 0 && nj >= 0 && ni < W && nj < H && depth[nj * W + ni] > depth[at] + 1.5;
      });
      if (near) step -= 1;
      // A face turned to a flame close by is a step lighter and takes a little of the flame's color
      const f = warm[at];
      if (f > 0.5) step += 1;
      if (shades === IRON) step = Math.min(step, 2);
      const hex = shades[Math.max(0, Math.min(shades.length - 1, step))];
      const c = (rgb[hex] ??= [1, 3, 5].map((n) => parseInt(hex.slice(n, n + 2), 16)));
      const tint = 0.15 * f;
      img.data.set([...c.map((v, k) => Math.round(v + (FLAME[k] - v) * tint)), 255], at * 4);
    }
  // An offscreen canvas, so a worker can paint solids too
  const canvas = new OffscreenCanvas(W, H);
  canvas.getContext('2d').putImageData(img, 0, 0);
  ctx.drawImage(canvas, x0, y0, W / k, H / k);
  const picture = { canvas, dx: x0 - anchor.x, dy: y0 - anchor.y };
  if (own) kept.set(own, picture);
  if (shared) kept.set(shared, picture);
}
