import { FIRE, TORCHES } from '../layout.js';
import { iso, TW } from '../projection.js';
import { COLOR as C } from '../tokens.js';

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
const warmth = (p, n) => {
  let sum = 0;
  for (const f of FLAMES) {
    const v = [f.at[0] - p[0], f.at[1] - p[1], f.at[2] - p[2]],
      dist = Math.hypot(...v);
    if (dist >= f.reach || dist < 1) continue;
    const facing = (n[0] * v[0] + n[1] * v[1] + n[2] * v[2]) / dist;
    if (facing > 0) sum += facing * (1 - dist / f.reach) ** 2;
  }
  return Math.min(1, sum);
};

// The sky's light comes from behind the camp, so a solid's spot on the ground falls a little toward the viewer
const SKY = [-0.3, -0.3, 1].map((v) => v / Math.hypot(0.3, 0.3, 1));
// How dark the ground is at g: soft where the path toward the sky passes close to a solid, and darkest at its foot
const groundShade = (g, dist, far) => {
  let open = 1;
  for (let t = 0.5, n = 0; n < 48 && t < far; n++) {
    const d = dist([g[0] + SKY[0] * t, g[1] + SKY[1] * t, SKY[2] * t]);
    if (d < 0.02) return 0.6;
    open = Math.min(open, (8 * d) / t);
    t += Math.max(d, 0.4);
  }
  const foot = Math.max(0, 1 - dist([g[0], g[1], 1]) / 4);
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

// A rod of radius r from a to b, rounded at both ends, for poles, ropes, and shafts
export function rod(a, b, r) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    ll = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
  return (p) => {
    const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]],
      t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / ll));
    return len(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t) - r;
  };
}

// parts: [{ sdf, paint(p, n, light) -> [shades, step] }], bounds: [[x, y, z], [x, y, z]] in units
export function drawSolids(ctx, parts, bounds) {
  // The frame also holds the spot the solids lay on the ground, which reaches out away from the sky's light
  const top = bounds[1][2] + 2,
    reach = (top / SKY[2]) * Math.hypot(SKY[0], SKY[1]),
    box = [
      [bounds[0][0] - 4, bounds[0][1] - 4, 0],
      [bounds[1][0] + reach + 4, bounds[1][1] + reach + 4, bounds[1][2]],
    ];
  const k = Math.min(4, ctx.getTransform().a),
    corners = [0, 1, 2, 3, 4, 5, 6, 7].map((n) => iso(box[n & 1][0] / U, box[(n >> 1) & 1][1] / U, box[n >> 2][2])),
    x0 = Math.floor(Math.min(...corners.map((p) => p.x))) - 1,
    y0 = Math.floor(Math.min(...corners.map((p) => p.y))) - 1,
    w = Math.ceil(Math.max(...corners.map((p) => p.x)) - x0) + 2,
    h = Math.ceil(Math.max(...corners.map((p) => p.y)) - y0) + 2,
    W = Math.ceil(w * k),
    H = Math.ceil(h * k);
  const warm = new Float32Array(W * H),
    depth = new Float32Array(W * H).fill(-Infinity),
    hits = Array.from({ length: W * H }),
    dark = new Float32Array(W * H);
  const scene = (p) => {
    let best = Infinity,
      part = null;
    for (const q of parts) {
      const d = q.sdf(p);
      if (d < best) [best, part] = [d, q];
    }
    return [best, part];
  };
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const [gx, gy] = ground(x0 + (i + 0.5) / k, y0 + (j + 0.5) / k);
      // Along the ray every unit up is also a unit toward +x and +y, so the point keeps its place on screen
      let hit = false;
      for (let s = top, n = 0; n < 120 && s > -1; n++) {
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
          warm[j * W + i] = warmth(p, nrm);
          hits[j * W + i] = part.paint(p, nrm, shade(nrm));
          hit = true;
          break;
        }
        // A step of s moves the point sqrt(3) units, so the distance divided by that never passes a surface
        s -= Math.max(d, 0.03) / Math.sqrt(3);
      }
      if (!hit) dark[j * W + i] = groundShade([gx, gy, 0], (p) => scene(p)[0], top / SKY[2]);
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
      if (f > 0.3) step += 1;
      const hex = shades[Math.max(0, Math.min(shades.length - 1, step))];
      const c = (rgb[hex] ??= [1, 3, 5].map((n) => parseInt(hex.slice(n, n + 2), 16)));
      const tint = 0.3 * f;
      img.data.set([...c.map((v, k) => Math.round(v + (FLAME[k] - v) * tint)), 255], at * 4);
    }
  const canvas = Object.assign(document.createElement('canvas'), { width: W, height: H });
  canvas.getContext('2d').putImageData(img, 0, 0);
  ctx.drawImage(canvas, x0, y0, W / k, H / k);
}
