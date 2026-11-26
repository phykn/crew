import { cast, longCast } from './casters.js';
import {
  BARK,
  CANVAS,
  BLAZE,
  GLOW,
  HAY,
  IRON,
  LEAF,
  NEEDLE,
  ROCK,
  U,
  WATER,
  WOOD,
  box,
  drawSolids,
  inPlace,
  facets,
  rod,
  round,
} from './solids.js';

// Where p lies against a blade leaving c in direction a: how far along, how far across, and its height
const bladeFrame = (c, a) => (p) => {
  const x = p[0] - c[0],
    y = p[1] - c[1];
  return [x * Math.cos(a) + y * Math.sin(a), -x * Math.sin(a) + y * Math.cos(a), p[2]];
};

// A fern: six fronds fanned over the back from one root and one short frond toward the viewer, each a narrow blade
// that arches and droops to its tip, widest a little before its middle, with a darker rib down its centre
function fern(ctx, d) {
  const c = [d.x * U, d.y * U];
  cast(ctx, d.x + 0.15, d.y + 0.15, 14, 10);
  // The viewer looks along -x and -y, so the back is round 5pi/4
  const fronds = [
    ...[...Array(6)].map((_, i) => [(5 * Math.PI) / 4 + ((i - 2.5) / 2.5) * ((2 * Math.PI) / 3), 11]),
    [Math.PI / 4, 7],
  ];
  const parts = fronds.map(([a, L]) => {
    const frame = bladeFrame(c, a);
    return {
      sdf: (p) => {
        const [along, across, z] = frame(p),
          t = Math.max(0, Math.min(1, along / L)),
          rise = 2.8 * L * t * (1.08 - t),
          half = 1.1 * Math.sin(Math.PI * Math.min(1, t * 1.1)) ** 0.8 + 0.3;
        // A blade a little thicker than a pixel, so it is found from above and from the side
        return Math.max(Math.abs(across) - half, Math.abs(z - rise) - 0.45, -along, along - L) * 0.65;
      },
      paint: (p, n, l) => [LEAF, Math.abs(frame(p)[1]) < 0.3 ? l - 1 : l],
    };
  });
  drawSolids(
    ctx,
    parts,
    [
      [c[0] - 13, c[1] - 13, 0],
      [c[0] + 13, c[1] + 13, 11],
    ],
    'fern',
  );
}

// A fallen log to sit on: one round trunk, a little thinner toward its far end and sunk into the ground, plain bark,
// and a cut end with two growth rings round a dark heart
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
      return [BARK, light];
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
      if (Math.abs(Math.abs(t) - 0.56) < 0.09) return [IRON, light];
      const stave = ((Math.atan2(p[1] - c[1], p[0] - c[0]) / (Math.PI * 2)) * 10 + 10) % 1;
      return [WOOD, stave < 0.08 ? light - 1 : light];
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
        if (n[2] > 0.9) return [ROCK, Math.min(l, 3)];
        const course = Math.floor(p[2] / (wall / 3)),
          mortar = Math.abs(p[2] - Math.round(p[2] / (wall / 3)) * (wall / 3)) < 0.4 && p[2] > 1 && p[2] < wall - 1,
          turn = ((Math.atan2(p[1] - c[1], p[0] - c[0]) / (Math.PI * 2)) * 9 + course * 0.5 + 9) % 1;
        return [ROCK, mortar || turn < 0.05 ? l - 1 : l];
      },
    },
    { sdf: round([c[0], c[1], wall - 4], 2, 0.5, () => inner), paint: () => [WATER, 2] },
    ...[-rim, rim].map((dy) => ({
      sdf: box([c[0], c[1] + dy, (wall + beam + 2) / 2], [1.3, 1.3, (beam + 2 - wall) / 2]),
      paint: (p, n, l) => [WOOD, l],
    })),
    { sdf: box([c[0], c[1], beam + 1.5], [1.4, rim + 2.5, 1.5]), paint: (p, n, l) => [WOOD, l] },
    // The rope hangs from the beam down to the bucket's top
    {
      sdf: round([c[0], c[1], (beam + wall + 16) / 2], 2, (beam - wall - 16) / 2, () => 0.35),
      paint: (p, n, l) => [HAY, l],
    },
    {
      sdf: round([c[0], c[1], wall + 13], 2, 3, (t) => 3 + 0.5 * t),
      paint: (p, n, l) => {
        // The top is told by height, so its edge is one dark ring rather than stray light dots
        if (p[2] > wall + 16 - 0.4) return [WOOD, 1];
        return Math.abs(p[2] - (wall + 13)) < 0.7 ? [IRON, 2] : [WOOD, l];
      },
    },
  ];
  drawSolids(ctx, parts, [
    [c[0] - out, c[1] - out, 0],
    [c[0] + out, c[1] + out, beam + 3],
  ]);
}

// A face's direction and how deep it is cut; fewer, larger faces toward the top keep the stone calm
const STONE = [
  [0, 0, 1, 0.96],
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

// A low boulder cut into flat faces; each face takes its shade from where it turns
function rock(ctx, d) {
  const s = d.size ?? 1,
    r = [9.5 * s, 7.5 * s, 5.5 * s],
    c = [d.x * U, d.y * U, 0.5 * s];
  cast(ctx, d.x + 0.2, d.y + 0.2, 15 * s, 14 * s);
  const part = { sdf: facets(c, r, STONE), paint: (p, n, light) => [ROCK, light] };
  drawSolids(
    ctx,
    [part],
    [
      [c[0] - r[0], c[1] - r[1], 0],
      [c[0] + r[0], c[1] + r[1], c[2] + r[2]],
    ],
  );
}

// A pine: a short brown trunk, a step darker than cut wood, under three broad skirts of needles, each smaller and higher; a skirt's hem juts out in
// nine pointed boughs whose tips hang a little lower, turned from tier to tier, so the light falls on it in steps
function pine(ctx, d) {
  const s = d.size ?? 1,
    c = [d.x * U, d.y * U];
  cast(ctx, d.x + 0.3, d.y + 0.3, 16 * s, 76 * s);
  const parts = [
    { sdf: round([c[0], c[1], 12 * s], 2, 12 * s, () => 2.2 * s), paint: (p, n, l) => [WOOD, Math.max(1, l - 1)] },
  ];
  for (let tier = 0; tier < 3; tier++) {
    const base = (21 + tier * 11) * s,
      r = [13, 10.4, 7.6][tier] * s,
      h = 22 * s;
    parts.push({
      sdf: (p) => {
        const a = Math.atan2(p[1] - c[1], p[0] - c[0]),
          turn = (a / (Math.PI * 2)) * 9 + tier * 0.37,
          // 1 at a bough's tip and 0 between two
          tip = 1 - 2 * Math.abs(turn - Math.floor(turn) - 0.5),
          z = p[2] - base + 2.2 * s * tip,
          t = Math.min(1, Math.max(0, z / h));
        const out = Math.hypot(p[0] - c[0], p[1] - c[1]) - r * (0.84 + 0.22 * tip) * (1 - t) ** 1.3;
        return Math.max(out * 0.55, -z, z - h);
      },
      paint: (p, n, l) => [NEEDLE, n[2] < -0.5 ? 0 : l],
    });
  }
  const R = 14.5 * s;
  drawSolids(
    ctx,
    parts,
    [
      [c[0] - R, c[1] - R, 0],
      [c[0] + R, c[1] + R, (21 + 22 + 22) * s],
    ],
    `pine${s}`,
  );
}

// A tuft of grass: seven flat blades from one root, each tapering to a point and leaning further the further out it
// stands, the outer two dry
function tuft(ctx, d) {
  const c = [d.x * U, d.y * U];
  const parts = [...Array(7)].map((_, i) => {
    const k = i - 3,
      H = Math.abs(k) === 3 ? 5.5 : 8 - Math.abs(k) * 1.2,
      lean = Math.abs(k) === 3 ? 2.6 : Math.abs(k) * 1.3,
      // Blades face the camera: their width and their lean both run across the view, along x - y on the ground
      frame = bladeFrame([c[0] + k * 0.45, c[1] - k * 0.45], -Math.PI / 4);
    return {
      sdf: (p) => {
        const [along, across, z] = frame(p),
          t = Math.max(0, Math.min(1, z / H));
        return (
          Math.max(
            Math.abs(along - Math.sign(k) * lean * t ** 1.5) - (0.8 * (1 - t) + 0.1),
            Math.abs(across) - 0.4,
            -z,
            z - H,
          ) * 0.5
        );
      },
      paint: (p, n, l) => (Math.abs(k) === 3 ? [HAY, 0] : [LEAF, l]),
    };
  });
  drawSolids(
    ctx,
    parts,
    [
      [c[0] - 7, c[1] - 7, 0],
      [c[0] + 7, c[1] + 7, 8],
    ],
    'tuft',
  );
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
          // The doorway is a narrower triangle in the end, dark inside and warm at its floor
          const x = Math.abs(p[0] - c[0]) / (W / 4),
            z = p[2] / (H * 0.75);
          if (x + z < 1) return [GLOW, z < 0.4 ? 2 : 1];
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
  const hood = { a: W / 2 + 1, b: 17 },
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
      const w = [c[0] + side * (W / 2 + 1.2), c[1] + u, 6];
      parts.push({
        sdf: round(w, 0, 0.8, () => 6),
        paint: (p, n, l) => {
          if (Math.abs(n[0]) < 0.6) return [WOOD, l - 1];
          const y = p[1] - w[1],
            z = p[2] - w[2],
            r = Math.hypot(y, z) / 6;
          if (r < 0.28) return [IRON, 2];
          if (r > 0.78) return [WOOD, l];
          // Eight spokes run out from the hub; between them the wheel is dark
          const a = Math.atan2(z, y);
          return Math.abs(Math.sin(2 * a)) < 0.22 || Math.abs(Math.cos(2 * a)) < 0.22 ? [WOOD, l] : [BARK, 2];
        },
      });
    }
  drawSolids(ctx, parts, [
    [c[0] - W / 2 - 3, c[1] - L / 2, 0],
    [c[0] + W / 2 + 3, c[1] + L / 2 + 0.9 * U + 1.5, 32],
  ]);
}

// Crates as the approved art draws them: a lid of three planks, plank faces held in a paler frame, a brace on the
// near face, and nails on the lid
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
        const frame = a < 0.1 || a > 0.9 || b < 0.14 || b > 0.86;
        // The brace runs from the top of the far post down to the foot of the near one
        const brace = n[1] > 0.9 && Math.abs(a - 0.15 - (0.84 - b) * (0.7 / 0.68)) < 0.08 && b > 0.1 && b < 0.9;
        if (frame || brace) return [WOOD, light + 1];
        return [WOOD, light];
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
      return [HAY, n[2] > 0.9 ? Math.min(light, 3) : light];
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
    half = 0.36 * U,
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
    { sdf: box([c[0], c[1], 10], [0.7, 0.7, 10], 0.2), paint: (p, n, l) => [WOOD, l - 1] },
    { sdf: rod([c[0], c[1], 17], [h[0], h[1], 17], 0.45), paint: (p, n, l) => [WOOD, l - 1] },
    { sdf: rod([h[0], h[1], 17], [h[0], h[1], 15], 0.25), paint: (p, n, l) => [IRON, l] },
    { sdf: box([h[0], h[1], 15], [1.6, 1.6, 0.6], 0.3), paint: (p, n, l) => [IRON, l] },
    { sdf: box([h[0], h[1], 9.6], [1.6, 1.6, 0.5], 0.3), paint: (p, n, l) => [IRON, l] },
    {
      sdf: box([h[0], h[1], glass], [1.3, 1.3, 2.2]),
      paint: (p) => {
        const across = Math.min(Math.abs(p[0] - h[0]), Math.abs(p[1] - h[1]));
        if (across > 0.95) return [IRON, 1];
        return [BLAZE, across < 0.5 && Math.abs(p[2] - glass) < 1.1 ? 4 : 2];
      },
    },
  ];
  drawSolids(ctx, parts, [
    [c[0] - 2, c[1] - 5, 0],
    [c[0] + 5, c[1] + 2, 21],
  ]);
}

// A torch's pole and iron cup, tapering up to the cup's charred top where the live flame stands (stage/effects.ts)
function torch(ctx, d) {
  const c = [d.x * U, d.y * U];
  const parts = [
    {
      sdf: round([c[0], c[1], 14], 2, 14, (t) => 1.1 - 0.15 * t),
      paint: (p, n, l) => (Math.abs(p[2] - 22) < 0.7 ? [IRON, l] : [WOOD, l - 1]),
    },
    {
      sdf: round([c[0], c[1], 29.5], 2, 1.5, (t) => 1.9 + 0.5 * t),
      paint: (p, n) => (n[2] > 0.9 ? [BARK, 1] : [IRON, 2]),
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
    ring = 1.1 * U,
    parts = [];
  for (let k = 0; k < 13; k++) {
    const a = (k / 13) * Math.PI * 2 + 0.2,
      s = 0.85 + (0.3 * ((k * 7) % 5)) / 4,
      r = [4.4 * s, 3.4 * s, 2.6 * s];
    parts.push({
      sdf: facets([c[0] + ring * Math.cos(a), c[1] + ring * Math.sin(a), 0.4], r, STONE),
      paint: (p, n, l) => [ROCK, l],
    });
  }
  for (const a of [0.5, 2.6, 4.7]) {
    const foot = [c[0] + 11 * Math.cos(a), c[1] + 11 * Math.sin(a), 1.6];
    parts.push({
      sdf: rod(foot, [c[0] - 1.5 * Math.cos(a), c[1] - 1.5 * Math.sin(a), 8.5], 2, true),
      paint: (p, n, l) => {
        const out = Math.hypot(p[0] - c[0], p[1] - c[1]);
        if (out < 2.5 && n[2] > 0.5) return [BLAZE, 1];
        // The cut end away from the fire shows its pale wood
        if (out > 9 && Math.abs(n[0] * Math.cos(a) + n[1] * Math.sin(a)) > 0.8) return [WOOD, 3];
        return [BARK, out < 7 ? 1 : l];
      },
    });
  }
  drawSolids(ctx, parts, [
    [c[0] - ring - 5.5, c[1] - ring - 5.5, 0],
    [c[0] + ring + 5.5, c[1] + ring + 5.5, 11],
  ]);
}

const PAINT = {
  fern,
  rock,
  log,
  drum,
  well,
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
// A prop's look depends only on what it is and where it stands
export const placeOf = (d) => [d.kind, d.x, d.y, d.w, d.h, d.size].join();
export const drawProp = (ctx, d) => inPlace(placeOf(d), () => PAINT[d.kind](ctx, d));
