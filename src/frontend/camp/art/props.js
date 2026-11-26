import { iso } from '../projection.js';
import { COLOR as C } from '../palette.js';
import { cast, longCast, shadow } from './shapes.js';
import { SEAT_Z } from '../figure.js';
import {
  BARK,
  CANVAS,
  BLAZE,
  GLOW,
  HAY,
  IRON,
  LEAF,
  ROCK,
  U,
  WATER,
  WOOD,
  box,
  drawSolids,
  facets,
  rod,
  round,
} from './solids.js';

const pixels = (ctx, list, fill) => {
  ctx.fillStyle = fill;
  for (const [x, y, w = 2, h = 1] of list) ctx.fillRect(x, y, w, h);
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
  longCast(ctx, d.x, d.y, d.w, d.h, 10);
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
  cast(ctx, d.x + 0.15, d.y + 0.15, 12, 22);
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

// A well: a round wall of three stone courses with staggered joints round dark water, two posts on its rim under a
// beam, and a bucket hanging from the beam on its rope
function well(ctx, d) {
  cast(ctx, d.x + 0.3, d.y + 0.3, 30, 40);
  const c = [d.x * U, d.y * U],
    out = 17,
    inner = 12.5,
    wall = 12,
    rim = (out + inner) / 2,
    beam = wall + 33;
  const radial = (p) => Math.hypot(p[0] - c[0], p[1] - c[1]);
  const parts = [
    {
      // A ring: as far from the wall's middle radius as half its thickness, and no higher than its top
      sdf: (p) => {
        const dr = Math.abs(radial(p) - rim) - (out - inner) / 2,
          dz = Math.abs(p[2] - wall / 2) - wall / 2;
        return Math.hypot(Math.max(dr, 0), Math.max(dz, 0)) + Math.min(Math.max(dr, dz), 0);
      },
      paint: (p, n, l) => {
        if (n[2] > 0.9) return [ROCK, l];
        const course = Math.floor(p[2] / (wall / 3)),
          mortar = Math.abs(p[2] - Math.round(p[2] / (wall / 3)) * (wall / 3)) < 0.4 && p[2] > 1 && p[2] < wall - 1,
          turn = ((Math.atan2(p[1] - c[1], p[0] - c[0]) / (Math.PI * 2)) * 11 + course * 0.5 + 11) % 1;
        return [ROCK, mortar || turn < 0.05 ? l - 1 : l];
      },
    },
    { sdf: round([c[0], c[1], wall - 4], 2, 0.5, () => inner), paint: () => [WATER, 2] },
    ...[-rim, rim].map((dy) => ({
      sdf: box([c[0], c[1] + dy, (wall + beam + 2) / 2], [1.3, 1.3, (beam + 2 - wall) / 2]),
      paint: (p, n, l) => [WOOD, l - 1],
    })),
    { sdf: box([c[0], c[1], beam + 1.5], [1.4, rim + 2.5, 1.5]), paint: (p, n, l) => [WOOD, l] },
    { sdf: round([c[0], c[1], beam - 6], 2, 6, () => 0.35), paint: (p, n, l) => [HAY, l] },
    {
      sdf: round([c[0], c[1], wall + 13], 2, 3, (t) => 3 + 0.5 * t),
      paint: (p, n, l) => {
        if (n[2] > 0.9) return [WOOD, 1];
        return Math.abs(p[2] - (wall + 13)) < 0.7 ? [IRON, l] : [WOOD, l];
      },
    },
  ];
  drawSolids(ctx, parts, [
    [c[0] - out, c[1] - out, 0],
    [c[0] + out, c[1] + out, beam + 3],
  ]);
}

// A box from a footprint in tiles and a height range in px, as solids measure it, its edges rounded by r
const slab = (x, y, w, h, z0, z1, r = 0) =>
  box([(x + w / 2) * U, (y + h / 2) * U, (z0 + z1) / 2], [(w / 2) * U, (h / 2) * U, (z1 - z0) / 2], r);

// A bench whose top is the seat people sit at: a plank of two boards on four square legs, or a stone slab on two blocks
function bench(ctx, d) {
  const { x, y, w, h } = d,
    leg = 0.18,
    long = w > h;
  longCast(ctx, x, y, w, h, SEAT_Z + 2);
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

// A face's direction and how deep it is cut; fewer, larger faces toward the top keep the stone calm
const STONE = [
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

// A low boulder cut into flat faces, higher toward its left; each face takes its shade from where it turns
function rock(ctx, d) {
  const s = d.size ?? 1,
    r = [9.5 * s, 7.5 * s, 5 * s],
    c = [d.x * U, d.y * U, 0.5 * s];
  cast(ctx, d.x + 0.2, d.y + 0.2, 15 * s, 14 * s);
  const faces = STONE;
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

// A pine: a short bark trunk under three tiers of needles, each smaller and higher; a tier is cut in seven flat faces
// that run out to its hem, so the light falls on it in steps; each overlaps the one below, hiding its shaded underside
function pine(ctx, d) {
  const s = d.size ?? 1,
    c = [d.x * U, d.y * U];
  cast(ctx, d.x + 0.3, d.y + 0.3, 14 * s, 70 * s);
  const parts = [{ sdf: round([c[0], c[1], 6 * s], 2, 6 * s, () => 1.6 * s), paint: (p, n, l) => [BARK, l] }];
  for (let tier = 0; tier < 3; tier++) {
    const base = (8 + tier * 12) * s,
      r = (11 - tier * 2.8) * s,
      h = 22 * s;
    parts.push({
      sdf: (p) => {
        const z = p[2] - base,
          a = Math.atan2(p[1] - c[1], p[0] - c[0]),
          face = (Math.PI * 2) / 7,
          // Distance out to the nearest of seven flat faces rather than to a circle
          out = Math.hypot(p[0] - c[0], p[1] - c[1]) * Math.cos(a - (Math.round(a / face - 0.3) + 0.3) * face),
          t = Math.min(1, Math.max(0, z / h));
        return Math.max((out - r * (1 - t)) * 0.75, -z);
      },
      paint: (p, n, l) => [LEAF, n[2] < -0.5 ? 0 : l],
    });
  }
  const R = 11 * s;
  drawSolids(
    ctx,
    parts,
    [
      [c[0] - R, c[1] - R, 0],
      [c[0] + R, c[1] + R, (8 + 24 + 22) * s],
    ],
    `pine${s}`,
  );
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

// A ridge tent, long along y with its open end toward the camera: canvas pitched in two slopes with seams down them
// and a darker hem, a doorway dark inside and warm with the lantern, poles above the ridge, and guy ropes to stakes
function tent(ctx, d) {
  const L = 1.9 * U,
    W = 1.6 * U,
    H = 26,
    c = [d.x * U, d.y * U];
  cast(ctx, d.x + 0.3, d.y + 0.3, 30, 26);
  const slopeLen = Math.hypot(H, W / 2);
  const parts = [
    {
      sdf: (p) =>
        Math.max(
          (Math.abs(p[0] - c[0]) * H + p[2] * (W / 2) - H * (W / 2)) / slopeLen,
          Math.abs(p[1] - c[1]) - L / 2,
          -p[2],
        ),
      paint: (p, n, l) => {
        if (n[1] > 0.9) {
          // The doorway is a narrower triangle in the end; its lower part glows
          const x = Math.abs(p[0] - c[0]) / (W / 4),
            z = p[2] / (H * 0.75);
          if (x + z < 1) return [GLOW, z < 0.55 && x + z < 0.7 ? 2 : 1];
          // The gable stands upright, so it reads a step darker than the slopes beside it
          return [CANVAS, l - 1];
        }
        const u = (p[1] - c[1]) / L + 0.5;
        if (p[2] < 2.5) return [CANVAS, l - 1];
        return [CANVAS, [1 / 3, 2 / 3].some((k) => Math.abs(u - k) < 0.015) ? l - 1 : l];
      },
    },
  ];
  for (const u of [-L / 2, L / 2])
    parts.push({ sdf: rod([c[0], c[1] + u, H - 1], [c[0], c[1] + u, H + 4], 0.7), paint: (p, n, l) => [WOOD, l - 1] });
  // One guy rope runs back from the far pole, so nothing crosses the doorway; pegs hold the hem at the near corners
  const back = [c[0], c[1] - L / 2 - 0.6 * U, 0];
  parts.push({
    sdf: rod([c[0], c[1] - L / 2, H + 2], [back[0], back[1], 1.5], 0.25),
    paint: (p, n, l) => [HAY, l - 1],
  });
  for (const peg of [back, [c[0] - W / 2 - 1, c[1] + L / 2 - 1, 0], [c[0] + W / 2 + 1, c[1] + L / 2 - 1, 0]])
    parts.push({ sdf: rod(peg, [peg[0], peg[1], 3], 0.6), paint: (p, n, l) => [WOOD, l - 1] });
  drawSolids(ctx, parts, [
    [c[0] - W / 2 - 2, c[1] - L / 2 - 0.7 * U, 0],
    [c[0] + W / 2 + 2, c[1] + L / 2, H + 5],
  ]);
}

// A covered wagon, long along y: a plank bed, a canvas bonnet over hoops with a dark opening at the near end, four
// spoked wheels, and a tongue down to the ground
function wagon(ctx, d) {
  const L = 2.4 * U,
    W = 1.1 * U,
    c = [d.x * U, d.y * U];
  cast(ctx, d.x + 0.3, d.y + 0.3, 34, 32);
  const hood = { a: W / 2, b: 17 },
    end = L / 2 - 0.15 * U;
  const parts = [
    {
      sdf: box([c[0], c[1], 10.5], [W / 2, L / 2, 4.5], 0.4),
      paint: (p, n, l) => [WOOD, n[2] < 0.9 && [9, 12].some((z) => Math.abs(p[2] - z) < 0.35) ? l - 1 : l],
    },
    {
      // Half an oval along y, cut at the bed's top and at both ends
      sdf: (p) => {
        const x = (p[0] - c[0]) / hood.a,
          z = (p[2] - 15) / hood.b;
        const arch = (Math.hypot(x, z) - 1) * Math.min(hood.a, hood.b);
        return Math.max(arch, 15 - p[2], Math.abs(p[1] - c[1]) - end);
      },
      paint: (p, n, l) => {
        const u = (p[1] - c[1] + end) / (2 * end);
        if (n[1] > 0.9) {
          const x = (p[0] - c[0]) / hood.a,
            z = (p[2] - 15) / hood.b;
          return Math.hypot(x, z) < 0.78 ? [BARK, 1] : [CANVAS, l - 1];
        }
        return [CANVAS, [0.25, 0.5, 0.75].some((k) => Math.abs(u - k) < 0.02) ? l - 1 : l];
      },
    },
    { sdf: rod([c[0], c[1] + L / 2, 9], [c[0], c[1] + L / 2 + 0.9 * U, 2], 0.9), paint: (p, n, l) => [WOOD, l - 1] },
  ];
  for (const u of [-L / 2 + 0.4 * U, L / 2 - 0.4 * U])
    for (const side of [-1, 1]) {
      const w = [c[0] + side * (W / 2 + 1.2), c[1] + u, 7];
      parts.push({
        sdf: round(w, 0, 0.8, () => 7),
        paint: (p, n, l) => {
          if (Math.abs(n[0]) < 0.6) return [WOOD, l - 1];
          const y = p[1] - w[1],
            z = p[2] - w[2],
            r = Math.hypot(y, z) / 7;
          if (r < 0.2) return [IRON, l];
          if (r > 0.78) return [WOOD, l];
          // Four spokes cross at the hub; between them the wheel is open, so the dark under the wagon shows
          const a = Math.atan2(z, y);
          return Math.abs(Math.sin(2 * a)) < 0.22 || Math.abs(Math.cos(2 * a)) < 0.22 ? [WOOD, l] : [BARK, 1];
        },
      });
    }
  drawSolids(ctx, parts, [
    [c[0] - W / 2 - 3, c[1] - L / 2, 0],
    [c[0] + W / 2 + 3, c[1] + L / 2 + 0.9 * U, 32],
  ]);
}

// Crates as the approved art draws them: a lid of three planks, plank faces held in a paler frame, a brace on the
// near face, and nails on the lid and the near face's top
function crates(ctx, d) {
  cast(ctx, d.x + 0.3, d.y + 0.3, 20, 20);
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
  cast(ctx, d.x + 0.2, d.y + 0.25, 16, 15);
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
  cast(ctx, d.x - 0.05, d.y + 0.1, 20, 15);
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

// A lantern on a post: a square post with an arm at its top, and from the arm an iron cap, four corner bars round
// glowing glass, and an iron base; the glass burns brightest round the wick
function lantern(ctx, d) {
  const c = [d.x * U, d.y * U],
    h = [c[0] + 3, c[1] - 3],
    glass = 12.2;
  const parts = [
    { sdf: box([c[0], c[1], 9], [0.7, 0.7, 9], 0.2), paint: (p, n, l) => [WOOD, l - 1] },
    { sdf: rod([c[0], c[1], 17], [h[0], h[1], 17], 0.45), paint: (p, n, l) => [WOOD, l - 1] },
    { sdf: rod([h[0], h[1], 17], [h[0], h[1], 15], 0.25), paint: (p, n, l) => [IRON, Math.min(l, 2)] },
    { sdf: box([h[0], h[1], 15], [1.6, 1.6, 0.6], 0.3), paint: (p, n, l) => [IRON, Math.min(l, 2)] },
    { sdf: box([h[0], h[1], 9.6], [1.6, 1.6, 0.5], 0.3), paint: (p, n, l) => [IRON, Math.min(l, 2)] },
    {
      sdf: box([h[0], h[1], glass], [1.3, 1.3, 2.2]),
      paint: (p) => {
        const across = Math.min(Math.abs(p[0] - h[0]), Math.abs(p[1] - h[1]));
        if (across > 0.95) return [IRON, 1];
        return [BLAZE, across < 0.5 && Math.abs(p[2] - glass) < 1.1 ? 4 : 3];
      },
    },
  ];
  drawSolids(ctx, parts, [
    [c[0] - 2, c[1] - 5, 0],
    [c[0] + 5, c[1] + 2, 18],
  ]);
}

// A torch's pole and iron cup, tapering up to the cup's charred top where the live flame stands (stage/effects.ts)
function torch(ctx, d) {
  const c = [d.x * U, d.y * U];
  const parts = [
    {
      sdf: round([c[0], c[1], 13.5], 2, 13.5, (t) => 1.1 - 0.15 * t),
      paint: (p, n, l) => (Math.abs(p[2] - 22) < 0.7 ? [IRON, Math.min(l, 2)] : [WOOD, l - 1]),
    },
    {
      sdf: round([c[0], c[1], 29.5], 2, 1.5, (t) => 1.9 + 0.5 * t),
      paint: (p, n, l) => (n[2] > 0.9 ? [BARK, 1] : [IRON, Math.min(l, 2)]),
    },
  ];
  drawSolids(ctx, parts, [
    [c[0] - 3, c[1] - 3, 0],
    [c[0] + 3, c[1] + 3, 31],
  ]);
}

// The hearth: a ring of stones, each cut like the rock but smaller and its size its own, round three logs that lean
// in to meet under the flames, charred and glowing where they burn
function hearth(ctx, d) {
  const c = [d.x * U, d.y * U],
    ring = 1.15 * U,
    parts = [];
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2 + 0.2,
      s = 0.85 + (0.3 * ((k * 7) % 5)) / 4,
      r = [3.6 * s, 3.2 * s, 2.6 * s];
    parts.push({
      sdf: facets([c[0] + ring * Math.cos(a), c[1] + ring * Math.sin(a), 0.4], r, STONE),
      paint: (p, n, l) => [ROCK, l],
    });
  }
  for (const a of [0.5, 2.6, 4.7]) {
    const foot = [c[0] + 11 * Math.cos(a), c[1] + 11 * Math.sin(a), 1.6];
    parts.push({
      sdf: rod(foot, [c[0] - 1.5 * Math.cos(a), c[1] - 1.5 * Math.sin(a), 6.5], 1.6),
      paint: (p, n, l) => {
        const out = Math.hypot(p[0] - c[0], p[1] - c[1]);
        if (out < 4) return [BLAZE, 1];
        return [BARK, out < 7 ? 1 : l];
      },
    });
  }
  drawSolids(ctx, parts, [
    [c[0] - ring - 4, c[1] - ring - 4, 0],
    [c[0] + ring + 4, c[1] + ring + 4, 9],
  ]);
}

const PAINT = {
  fern,
  rock,
  log,
  drum,
  well,
  bench,
  pine,
  tuft,
  tent,
  wagon,
  crates,
  hay,
  woodpile,
  lantern,
  torch,
  hearth,
};
export const drawProp = (ctx, d) => PAINT[d.kind](ctx, d);
