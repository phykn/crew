import { iso } from '../projection.js';
import { COLOR as C } from '../tokens.js';
import { TAU, longShadow, oval, poly, shadow } from './shapes.js';
import { SEAT_Z } from '../figure.js';
import { BARK, HAY, IRON, ROCK, U, WOOD, box, drawSolids, facets, round } from './solids.js';

const pixels = (ctx, list, fill) => {
  ctx.fillStyle = fill;
  for (const [x, y, w = 2, h = 1] of list) ctx.fillRect(x, y, w, h);
};
const line = (ctx, a, b, color, width = 1) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
};
const outline = (ctx, x, y, rx, ry, color, width) => {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.stroke();
};

// Fronds arch up from one root and droop at the tip, with paired leaflets that shorten toward it; single dots read as noise
function fern(ctx, d) {
  const b = iso(d.x, d.y);
  shadow(ctx, d.x + 0.15, d.y + 0.15, 14, 4, 10);
  ctx.lineCap = 'round';
  [-150, -128, -105, -75, -52, -30].forEach((deg, i) => {
    const a = (deg * Math.PI) / 180,
      len = 16 - Math.abs(i - 2.5) * 1.8,
      at = (k) => ({ x: b.x + Math.cos(a) * k * 1.1, y: b.y - 1 + Math.sin(a) * k * 1.1 + k * k * 0.06 });
    ctx.strokeStyle = C.leafDark;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(b.x, b.y - 1);
    for (let k = 1; k <= len; k++) ctx.lineTo(at(k).x, at(k).y);
    ctx.stroke();
    ctx.lineWidth = 1;
    for (let k = 2; k < len; k += 1.5) {
      const p = at(k),
        q = at(k + 0.5),
        // The frond's own direction here, so leaflets follow the droop rather than the start
        dir = Math.atan2(q.y - p.y, q.x - p.x),
        leaf = 3 * (1 - k / len) + 0.7;
      ctx.strokeStyle = k < len * 0.55 ? C.leaf : C.mossDark;
      for (const s of [1, -1]) {
        // Each leaflet leans toward the tip, so the frond reads as a feather, not a comb
        const side = dir + s * 1.1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(side) * leaf, p.y + Math.sin(side) * leaf);
        ctx.stroke();
      }
    }
  });
  ctx.lineCap = 'butt';
}

// A fallen log to sit on: one round trunk, a little thinner toward its far end and sunk into the ground, three furrows
// along its bark, and a cut end with two growth rings round a dark heart
function log(ctx, d) {
  longShadow(ctx, d.x, d.y, d.w, d.h, 10);
  const R = 5,
    half = (d.w * U) / 2,
    c = [d.x * U + half, (d.y + d.h / 2) * U, R * 0.9];
  const part = {
    sdf: round(c, 0, half, (t) => R * (0.96 + 0.04 * t)),
    paint: (p, n, light) => {
      const y = p[1] - c[1],
        z = p[2] - c[2];
      if (n[0] > 0.7) {
        const r = Math.hypot(y, z) / R;
        if (r > 0.86) return [BARK, light + 1];
        if (r < 0.12) return [WOOD, light];
        return [WOOD, light + ([0.35, 0.62].some((a) => Math.abs(r - a) < 0.05) ? 1 : 2)];
      }
      // Furrows run the length of the bark at fixed angles round the trunk
      const a = Math.atan2(z, y);
      return [BARK, [0.5, 1.6, 2.5].some((f) => Math.abs(a - f) < 0.07) ? light - 1 : light];
    },
  };
  drawSolids(
    ctx,
    [part],
    [
      [c[0] - half, c[1] - R, c[2] - R],
      [c[0] + half, c[1] + R, c[2] + R],
    ],
  );
}

// A barrel: staves bellied out between a narrower foot and lid, a seam between each pair, two iron hoops, and a lid
// sunk in a darker rim
function drum(ctx, d) {
  shadow(ctx, d.x + 0.15, d.y + 0.15, 12, 4.5, 22);
  const H = 20,
    r0 = 5,
    belly = 1.8,
    c = [d.x * U, d.y * U, H / 2];
  const radius = (t) => r0 + belly * (1 - t * t);
  const part = {
    sdf: round(c, 2, H / 2, radius),
    paint: (p, n, light) => {
      const t = (p[2] - c[2]) / (H / 2),
        r = Math.hypot(p[0] - c[0], p[1] - c[1]);
      if (n[2] > 0.9) return [WOOD, r > radius(1) - 0.9 ? light - 2 : light];
      // Iron is matte and dark: even where the belly turns it up to the light it stays below the wood
      if (Math.abs(Math.abs(t) - 0.56) < 0.09) return [IRON, Math.min(light, 2)];
      const stave = ((Math.atan2(p[1] - c[1], p[0] - c[0]) / (Math.PI * 2)) * 14 + 14) % 1;
      return [WOOD, stave < 0.1 ? light - 1 : light];
    },
  };
  const w = r0 + belly;
  drawSolids(
    ctx,
    [part],
    [
      [c[0] - w, c[1] - w, 0],
      [c[0] + w, c[1] + w, H],
    ],
  );
}

function well(ctx, d) {
  const b = iso(d.x, d.y),
    rx = 24,
    ry = 12,
    wall = 12;
  const top = b.y - wall,
    courses = 3,
    course = wall / courses;
  shadow(ctx, d.x + 0.3, d.y + 0.3, 30, 13, 40);
  oval(ctx, b.x, b.y, rx, ry, C.rock, Math.PI);
  ctx.fillRect(b.x - rx, top, rx * 2, wall);
  // Mortar runs along the wall's curve and the joints stagger by course; square blocks laid flat read as a box
  ctx.strokeStyle = C.rockDark;
  ctx.lineWidth = 1;
  for (let c = 0; c < courses; c++) {
    const y0 = top + c * course;
    if (c > 0) {
      ctx.beginPath();
      ctx.ellipse(b.x, y0, rx, ry, 0, 0, Math.PI);
      ctx.stroke();
    }
    for (let k = 0; k < 6; k++) {
      const a = (Math.PI * (k + 0.3 + (c % 2) * 0.5)) / 6;
      // A joint at either edge would be seen side-on and stand out as a notch
      if (a < 0.3 || a > Math.PI - 0.3) continue;
      const x = Math.round(b.x + Math.cos(a) * rx) + 0.5,
        y = y0 + Math.sin(a) * ry;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + course);
      ctx.stroke();
    }
  }
  // The rim's top is lit, and its inner edge drops into shade before the water
  oval(ctx, b.x, top, rx, ry, C.rockLight);
  oval(ctx, b.x, top, rx - 5, ry - 2.5, C.rockDark);
  oval(ctx, b.x, top + 1, rx - 6.5, ry - 3.5, C.water);
  pixels(
    ctx,
    [
      [b.x - rx + 2, top - 34, 4, 34],
      [b.x + rx - 6, top - 34, 4, 34],
    ],
    C.pole,
  );
  pixels(ctx, [[b.x - rx, top - 36, rx * 2, 4]], C.woodDark);
  pixels(ctx, [[b.x, top - 32, 1, 16]], C.muted);
  // A bucket tapers to its foot and shows its round mouth
  const mouth = top - 16;
  poly(
    ctx,
    [
      { x: b.x - 5, y: mouth },
      { x: b.x + 6, y: mouth },
      { x: b.x + 4.5, y: mouth + 8 },
      { x: b.x - 3.5, y: mouth + 8 },
    ],
    C.woodDeep,
  );
  pixels(ctx, [[b.x - 4, mouth + 3, 9, 1]], C.iron);
  oval(ctx, b.x + 0.5, mouth, 5.5, 1.5, C.wood);
}

// A box from a footprint in tiles and a height range in px, as solids measure it, its edges rounded by r
const slab = (x, y, w, h, z0, z1, r = 0) =>
  box([(x + w / 2) * U, (y + h / 2) * U, (z0 + z1) / 2], [(w / 2) * U, (h / 2) * U, (z1 - z0) / 2], r);

// A bench whose top is the seat people sit at: a plank of two boards on four square legs, or a stone slab on two blocks
function bench(ctx, d) {
  const { x, y, w, h } = d,
    leg = 0.18,
    long = w > h;
  longShadow(ctx, x, y, w, h, SEAT_Z + 2);
  const parts = [];
  if (d.wood) {
    for (const [lx, ly] of [
      [x, y],
      [x + w - leg, y],
      [x, y + h - leg],
      [x + w - leg, y + h - leg],
    ])
      parts.push({
        sdf: slab(lx + 0.02, ly + 0.02, leg - 0.04, leg - 0.04, 0, SEAT_Z - 2),
        paint: (p, n, l) => [WOOD, l - 1],
      });
    // The seam between the two boards runs down the middle of the plank
    const mid = long ? (y + h / 2) * U : (x + w / 2) * U;
    parts.push({
      sdf: slab(x, y, w, h, SEAT_Z - 2.2, SEAT_Z, 0.5),
      paint: (p, n, l) => [WOOD, n[2] > 0.9 && Math.abs(p[long ? 1 : 0] - mid) < 0.35 ? l - 2 : l],
    });
  } else {
    const block = long ? [0.4, h] : [w, 0.4];
    for (const [bx, by] of [[x, y], long ? [x + w - 0.4, y] : [x, y + h - 0.4]])
      parts.push({
        sdf: slab(bx + 0.04, by + 0.04, block[0] - 0.08, block[1] - 0.08, 0, SEAT_Z - 2, 0.8),
        paint: (p, n, l) => [ROCK, l - 1],
      });
    parts.push({ sdf: slab(x, y, w, h, SEAT_Z - 2, SEAT_Z + 1, 0.9), paint: (p, n, l) => [ROCK, l] });
  }
  drawSolids(ctx, parts, [
    [x * U, y * U, 0],
    [(x + w) * U, (y + h) * U, SEAT_Z + 1],
  ]);
}

// A low boulder cut into flat faces, higher toward its left; each face takes its shade from where it turns
function rock(ctx, d) {
  const s = d.size ?? 1,
    r = [9.5 * s, 7.5 * s, 5 * s],
    c = [d.x * U, d.y * U, 0.5 * s];
  shadow(ctx, d.x + 0.2, d.y + 0.2, 15 * s, 5 * s, 14 * s);
  // A face's direction and how deep it is cut; fewer, larger faces toward the top keep the stone calm
  const faces = [
    [0, 0, 1, 0.9],
    [-0.6, 0.3, 1, 0.97],
    [0.5, -0.4, 1, 0.92],
    [0.3, 0.7, 0.8, 0.95],
    [-0.4, -0.7, 0.9, 0.96],
    [1, 0.2, 0.5, 0.9],
    [-1, 0, 0.3, 0.98],
    [0.2, 1, 0.3, 0.97],
    [-0.3, -1, 0.3, 0.95],
    [0.8, 0.8, 0.2, 0.93],
    [0.8, -0.7, 0.2, 0.96],
    [-0.8, 0.7, 0.2, 0.98],
  ];
  const part = { sdf: facets(c, r, faces), paint: (p, n, light) => [ROCK, light] };
  drawSolids(
    ctx,
    [part],
    [
      [c[0] - r[0], c[1] - r[1], 0],
      [c[0] + r[0], c[1] + r[1], c[2] + r[2]],
    ],
  );
}

function pine(ctx, d) {
  const b = iso(d.x, d.y),
    s = d.size ?? 1;
  shadow(ctx, d.x + 0.3, d.y + 0.3, 14 * s, 5 * s, 70 * s);
  pixels(ctx, [[b.x - 2, b.y - 10 * s, 4, 10 * s]], C.barkDark);
  // Tiers stepped in 2px rows read as pixel art rather than a smooth cone
  for (let tier = 0; tier < 3; tier++) {
    const h = Math.round(20 * s),
      top = Math.round(b.y - (8 + tier * 14) * s) - h,
      wide = (16 - tier * 4) * s;
    for (let r = 2; r <= h; r += 2) {
      const half = Math.max(1, Math.round((wide * r) / h));
      pixels(ctx, [[b.x - half, top + r - 2, half * 2, 2]], C.leafDark);
      pixels(ctx, [[b.x - half, top + r - 2, Math.ceil(half * 0.6), 2]], C.leaf);
    }
  }
}

// Blades fan out from one root, so a tuft reads as grass rather than sticks
function tuft(ctx, d) {
  const b = iso(d.x, d.y);
  for (let i = -3; i <= 3; i++) {
    const h = 7 - Math.abs(i) * 1.5;
    for (let k = 0; k < h; k++)
      pixels(ctx, [[b.x + i * 1.5 + (i * k) / 3, b.y - k, 1, 1]], i % 2 ? C.grassDry : C.mossDark);
  }
}

// u runs along the long axis to the end the camera sees, v across it
const along =
  (d, L) =>
  (u, v, z = 0) =>
    iso(d.x + v, d.y - L / 2 + u, z);

function tent(ctx, d) {
  const L = 1.9,
    W = 1.6,
    H = 26,
    at = along(d, L);
  // A point on the near slope at height z, so the hem follows the cloth
  const slope = (u, z) => at(u, (W / 2) * (1 - z / H), z);
  shadow(ctx, d.x + 0.3, d.y + 0.3, 30, 12, 26);
  for (const side of [-1, 1]) {
    const stake = at(L + 0.5, side * (W / 2 + 0.3));
    line(ctx, at(L, 0, H), stake, C.muted);
    pixels(ctx, [[stake.x - 1, stake.y - 3, 2, 3]], C.woodDark);
  }
  poly(ctx, [at(0, -W / 2), at(L, -W / 2), at(L, 0, H), at(0, 0, H)], C.canvasDeep);
  poly(ctx, [at(0, W / 2), at(L, W / 2), at(L, 0, H), at(0, 0, H)], C.canvas);
  poly(ctx, [at(0, W / 2), at(L, W / 2), slope(L, 4), slope(0, 4)], C.canvasDark);
  for (const k of [0.33, 0.66]) line(ctx, at(L * k, 0, H), at(L * k, W / 2), C.canvasDark);
  poly(ctx, [at(L, -W / 2), at(L, W / 2), at(L, 0, H)], C.canvasDark);
  // The doorway glows from the lantern inside, and its flaps are tied back on both sides
  poly(ctx, [at(L, -W / 4), at(L, W / 4), at(L, 0, H * 0.75)], C.leather);
  ctx.globalAlpha = 0.45;
  poly(ctx, [at(L, -W / 6), at(L, W / 6), at(L, 0, H * 0.4)], C.flameDeep);
  ctx.globalAlpha = 1;
  for (const side of [-1, 1])
    poly(ctx, [at(L, (side * W) / 4), at(L, (side * W) / 2.6), at(L, (side * W) / 8, H * 0.6)], C.canvas);
  for (const u of [0, L]) {
    const p = at(u, 0, H);
    pixels(ctx, [[p.x - 1, p.y - 4, 2, 4]], C.pole);
  }
}

function wagon(ctx, d) {
  const L = 2.4,
    W = 1.1,
    at = along(d, L);
  shadow(ctx, d.x + 0.3, d.y + 0.3, 34, 12, 32);
  const wheel = (p) => {
    outline(ctx, p.x, p.y, 5, 7, C.woodDeep, 2);
    pixels(
      ctx,
      [
        [p.x - 1, p.y - 6, 1, 12],
        [p.x - 4, p.y, 8, 1],
      ],
      C.woodDark,
    );
    pixels(ctx, [[p.x - 1, p.y - 1, 2, 2]], C.iron);
  };
  // The far wheels go first, as the bed hides their lower half
  wheel(at(0.4, -W / 2, 7));
  wheel(at(L - 0.4, -W / 2, 7));
  line(ctx, at(L, 0, 8), at(L + 0.9, 0, 3), C.woodDark, 2);
  poly(ctx, [at(0, W / 2, 6), at(L, W / 2, 6), at(L, W / 2, 15), at(0, W / 2, 15)], C.wood);
  poly(ctx, [at(L, -W / 2, 6), at(L, W / 2, 6), at(L, W / 2, 15), at(L, -W / 2, 15)], C.woodDark);
  // The bonnet is a canvas arch: its side, its curved top, and the open hoop at the end
  poly(ctx, [at(0.15, W / 2, 15), at(L - 0.15, W / 2, 15), at(L - 0.15, W / 2, 26), at(0.15, W / 2, 26)], C.canvas);
  poly(ctx, [at(0.15, W / 2, 26), at(L - 0.15, W / 2, 26), at(L - 0.15, 0, 32), at(0.15, 0, 32)], C.canvas);
  for (const k of [0.25, 0.5, 0.75]) line(ctx, at(L * k, W / 2, 15), at(L * k, W / 2, 26), C.canvasDark);
  poly(
    ctx,
    [
      at(L - 0.15, -W / 2, 15),
      at(L - 0.15, W / 2, 15),
      at(L - 0.15, W / 2, 26),
      at(L - 0.15, 0, 32),
      at(L - 0.15, -W / 2, 26),
    ],
    C.canvasDark,
  );
  poly(
    ctx,
    [
      at(L - 0.15, -W / 3, 15),
      at(L - 0.15, W / 3, 15),
      at(L - 0.15, W / 3, 24),
      at(L - 0.15, 0, 28),
      at(L - 0.15, -W / 3, 24),
    ],
    C.leather,
  );
  wheel(at(0.4, W / 2 + 0.05, 7));
  wheel(at(L - 0.4, W / 2 + 0.05, 7));
}

// Crates as the approved art draws them: a lid of three planks, plank faces held in a paler frame, a brace on the
// near face, and nails on the lid and the near face's top
function crates(ctx, d) {
  shadow(ctx, d.x + 0.3, d.y + 0.3, 20, 7, 20);
  const S = 0.6 * U,
    H = 10;
  const crate = (x, y, z0) => {
    const c = [x * U + S / 2, y * U + S / 2, z0 + H / 2];
    const nail = (u, v) => Math.hypot(u.at - u.to, v.at - v.to) < 0.045;
    return {
      sdf: box(c, [S / 2, S / 2, H / 2]),
      paint: (p, n, light) => {
        const u = (p[0] - c[0]) / S + 0.5,
          v = (p[1] - c[1]) / S + 0.5,
          w = (p[2] - c[2]) / H + 0.5;
        if (n[2] > 0.9) {
          if ([0.08, 0.92].some((a) => [0.08, 0.92].some((b) => nail({ at: u, to: a }, { at: v, to: b }))))
            return [IRON, 2];
          return [WOOD, [1 / 3, 2 / 3].some((s) => Math.abs(v - s) < 0.025) ? light - 2 : light];
        }
        // Along the face and up it: the near face runs with x, the side face with y
        const [a, b] = n[1] > 0.9 ? [u, w] : [v, w];
        if (n[1] > 0.9 && [0.05, 0.95].some((s) => nail({ at: a, to: s }, { at: b, to: 0.93 }))) return [IRON, 2];
        const frame = a < 0.1 || a > 0.9 || b < 0.14 || b > 0.86;
        // The brace runs from the top of the far post down to the foot of the near one
        const brace = n[1] > 0.9 && Math.abs(a - 0.15 - (0.84 - b) * (0.7 / 0.68)) < 0.08 && b > 0.1 && b < 0.9;
        if (frame || brace) return [WOOD, light + 1];
        return [WOOD, [0.37, 0.63].some((s) => Math.abs(b - s) < 0.02) ? light - 1 : light];
      },
    };
  };
  const x = d.x - 0.65,
    y = d.y - 0.3;
  drawSolids(
    ctx,
    [crate(x, y, 0), crate(x + 0.65, y, 0), crate(x + 0.3, y, H)],
    [
      [x * U, y * U, 0],
      [(x + 1.25) * U, (y + 0.6) * U, 2 * H],
    ],
  );
}

// A hay bale: a box with soft rounded edges, two unbroken straw layers along its long face and one across its end,
// and two twine bands over the top and down the near face
function hay(ctx, d) {
  const L = 0.8 * U,
    W = 0.6 * U,
    H = 10,
    c = [d.x * U, d.y * U, H / 2];
  shadow(ctx, d.x + 0.2, d.y + 0.25, 16, 6, 15);
  const part = {
    sdf: box(c, [L / 2, W / 2, H / 2], 1.6),
    paint: (p, n, light) => {
      const x = p[0] - c[0];
      if ([-0.22, 0.22].some((t) => Math.abs(x - t * L) < 0.45) && n[0] < 0.6) return [WOOD, 2];
      if (n[2] < 0.6) {
        const layers = n[0] > 0.6 ? [5] : [3.5, 6.5];
        if (layers.some((z) => Math.abs(p[2] - z) < 0.35)) return [HAY, light - 1];
      }
      return [HAY, light];
    },
  };
  drawSolids(
    ctx,
    [part],
    [
      [c[0] - L / 2, c[1] - W / 2, 0],
      [c[0] + L / 2, c[1] + W / 2, H],
    ],
  );
}

// A woodpile: five round logs, three under two, each top log in the notch of the two below; a cut end shows its
// rim of bark and one growth ring
function woodpile(ctx, d) {
  shadow(ctx, d.x - 0.05, d.y + 0.1, 20, 7, 15);
  const R = 0.21 * U,
    half = 0.27 * U,
    cx = (d.x - 0.05) * U,
    cy = d.y * U,
    low = R,
    high = R * (1 + Math.sqrt(3));
  const parts = [
    [-2, low],
    [-1, high],
    [0, low],
    [1, high],
    [2, low],
  ].map(([k, z]) => {
    const c = [cx, cy + k * R, z];
    return {
      sdf: round(c, 0, half, () => R),
      paint: (p, n, light) => {
        if (Math.abs(n[0]) < 0.7) return [BARK, light];
        const r = Math.hypot(p[1] - c[1], p[2] - c[2]) / R;
        if (r > 0.84) return [BARK, light + 1];
        return [WOOD, light + (r > 0.4 && r < 0.5 ? 1 : 2)];
      },
    };
  });
  drawSolids(ctx, parts, [
    [cx - half, cy - 3 * R, 0],
    [cx + half, cy + 3 * R, high + R],
  ]);
}

function lantern(ctx, d) {
  const b = iso(d.x, d.y);
  pixels(
    ctx,
    [
      [b.x - 1, b.y - 18, 2, 18],
      [b.x - 1, b.y - 18, 6, 1],
    ],
    C.pole,
  );
  pixels(ctx, [[b.x + 2, b.y - 16, 3, 1]], C.iron);
  pixels(ctx, [[b.x + 2, b.y - 15, 3, 4]], C.flame);
  pixels(ctx, [[b.x + 3, b.y - 14, 1, 2]], C.flameCore);
}

const PAINT = { fern, rock, log, drum, well, bench, pine, tuft, tent, wagon, crates, hay, woodpile, lantern };
export const drawDecor = (ctx, d) => PAINT[d.kind](ctx, d);
