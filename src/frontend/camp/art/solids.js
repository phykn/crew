import { iso } from '../projection.js';
import { COLOR as C } from '../tokens.js';

// Props modelled as solids and drawn by casting a ray per pixel through the camp's own projection, so their shape,
// overlap, and light follow from the model rather than from strokes placed by hand

// One tile is 16 units, as long as 16 px of height, so a solid uses one unit on every axis
export const U = 16;

// Each material's shades from darkest to lightest; light picks 1 to 4, and details step down or up from there
export const WOOD = [C.barkDark, C.woodDeep, C.woodDark, C.wood, C.woodLight];
export const BARK = [C.eye, C.barkDark, C.bark, C.woodDeep, C.woodDark];
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
export function box(c, h) {
  return (p) => {
    const q = [Math.abs(p[0] - c[0]) - h[0], Math.abs(p[1] - c[1]) - h[1], Math.abs(p[2] - c[2]) - h[2]];
    return len(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0)) + Math.min(Math.max(...q), 0);
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

// parts: [{ sdf, paint(p, n, light) -> [shades, step] }], bounds: [[x, y, z], [x, y, z]] in units
export function drawSolids(ctx, parts, bounds) {
  const k = Math.min(4, ctx.getTransform().a),
    corners = [0, 1, 2, 3, 4, 5, 6, 7].map((n) =>
      iso(bounds[n & 1][0] / U, bounds[(n >> 1) & 1][1] / U, bounds[n >> 2][2]),
    ),
    x0 = Math.floor(Math.min(...corners.map((p) => p.x))) - 1,
    y0 = Math.floor(Math.min(...corners.map((p) => p.y))) - 1,
    w = Math.ceil(Math.max(...corners.map((p) => p.x)) - x0) + 2,
    h = Math.ceil(Math.max(...corners.map((p) => p.y)) - y0) + 2,
    W = Math.ceil(w * k),
    H = Math.ceil(h * k);
  const depth = new Float32Array(W * H).fill(-Infinity),
    hits = Array.from({ length: W * H });
  const scene = (p) => {
    let best = Infinity,
      part = null;
    for (const q of parts) {
      const d = q.sdf(p);
      if (d < best) [best, part] = [d, q];
    }
    return [best, part];
  };
  const top = bounds[1][2] + 2;
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const [gx, gy] = ground(x0 + (i + 0.5) / k, y0 + (j + 0.5) / k);
      // Along the ray every unit up is also a unit toward +x and +y, so the point keeps its place on screen
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
          hits[j * W + i] = part.paint(p, nrm, shade(nrm));
          break;
        }
        // A step of s moves the point sqrt(3) units, so the distance divided by that never passes a surface
        s -= Math.max(d, 0.03) / Math.sqrt(3);
      }
    }
  const img = new ImageData(W, H),
    rgb = {};
  for (let j = 0; j < H; j++)
    for (let i = 0; i < W; i++) {
      const at = j * W + i,
        hit = hits[at];
      if (!hit) continue;
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
      const hex = shades[Math.max(0, Math.min(shades.length - 1, step))];
      const c = (rgb[hex] ??= [1, 3, 5].map((n) => parseInt(hex.slice(n, n + 2), 16)));
      img.data.set([...c, 255], at * 4);
    }
  const canvas = Object.assign(document.createElement('canvas'), { width: W, height: H });
  canvas.getContext('2d').putImageData(img, 0, 0);
  ctx.drawImage(canvas, x0, y0, W / k, H / k);
}
