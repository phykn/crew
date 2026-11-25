import { iso } from '../projection.js';
import { COLOR as C } from '../tokens.js';
import { TAU, longShadow, oval, poly, prism, shadow } from './shapes.js';
import { SEAT_Z } from '../figure.js';

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

// A thick stroke with a lit top, and a cut end ringed with growth lines, reads as a round trunk
function log(ctx, d) {
  longShadow(ctx, d.x, d.y, d.w, d.h, 10);
  const yc = d.y + d.h / 2,
    a = iso(d.x, yc, 5),
    b = iso(d.x + d.w, yc, 5);
  line(ctx, a, b, C.barkDark, 10);
  line(ctx, { x: a.x, y: a.y - 1 }, { x: b.x, y: b.y - 1 }, C.bark, 7);
  line(ctx, { x: a.x, y: a.y - 3 }, { x: b.x, y: b.y - 3 }, C.woodDark, 1);
  const m = iso(d.x + d.w * 0.35, yc, 9);
  pixels(
    ctx,
    [
      [m.x, m.y, 6, 2],
      [m.x + 9, m.y + 4, 4, 1],
    ],
    C.mossDark,
  );
  oval(ctx, b.x, b.y, 3.5, 5, C.woodDark);
  outline(ctx, b.x, b.y, 2, 3, C.woodDeep, 1);
  pixels(ctx, [[b.x, b.y, 1, 1]], C.wood);
}

// The staves bulge at the middle and the foot and hoops follow the round; a flat-cut rectangle reads as a box
function drum(ctx, d) {
  const b = iso(d.x, d.y),
    h = 20,
    rx = 7,
    ry = 3;
  shadow(ctx, d.x + 0.15, d.y + 0.15, 10, 4, 22);
  ctx.beginPath();
  ctx.moveTo(b.x - rx, b.y - h);
  ctx.quadraticCurveTo(b.x - rx - 2, b.y - h / 2, b.x - rx, b.y);
  ctx.ellipse(b.x, b.y, rx, ry, 0, Math.PI, 0, true);
  ctx.quadraticCurveTo(b.x + rx + 2, b.y - h / 2, b.x + rx, b.y - h);
  ctx.closePath();
  ctx.fillStyle = C.wood;
  ctx.fill();
  ctx.save();
  ctx.clip();
  pixels(ctx, [[b.x + 2, b.y - h - 1, rx + 2, h + ry + 2]], C.woodDark);
  pixels(
    ctx,
    [
      [b.x - 4, b.y - h, 1, h + ry],
      [b.x, b.y - h, 1, h + ry],
    ],
    C.woodDeep,
  );
  ctx.strokeStyle = C.iron;
  ctx.lineWidth = 2;
  for (const z of [h - 4, 5]) {
    ctx.beginPath();
    ctx.ellipse(b.x, b.y - z, rx + 1, ry, 0, 0, Math.PI);
    ctx.stroke();
  }
  ctx.restore();
  oval(ctx, b.x, b.y - h, rx, ry, C.woodDeep);
  oval(ctx, b.x, b.y - h, rx - 1.5, ry - 1, C.woodDark);
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

function bench(ctx, d) {
  const { x, y, w, h } = d,
    leg = 0.18,
    long = w > h;
  longShadow(ctx, x, y, w, h, SEAT_Z + 2);
  if (d.wood) {
    for (const [lx, ly] of [
      [x, y],
      [x + w - leg, y],
      [x, y + h - leg],
      [x + w - leg, y + h - leg],
    ]) {
      prism(ctx, { x: lx, y: ly, w: leg, h: leg, z: SEAT_Z - 2 }, C.woodDeep, C.barkDark, C.barkDark);
    }
    prism(ctx, { x, y, w, h, z: SEAT_Z, z0: SEAT_Z - 2 }, C.wood, C.woodDark, C.woodDeep);
    // One groove down the plank shows the grain
    line(
      ctx,
      iso(x + (long ? 0.1 : w / 2), y + (long ? h / 2 : 0.1), SEAT_Z),
      iso(x + (long ? w - 0.1 : w / 2), y + (long ? h / 2 : h - 0.1), SEAT_Z),
      C.woodDark,
    );
    return;
  }
  const block = long ? { w: 0.4, h } : { w, h: 0.4 };
  for (const at of [{ x, y }, long ? { x: x + w - 0.4, y } : { x, y: y + h - 0.4 }]) {
    prism(ctx, { ...at, ...block, z: SEAT_Z - 2 }, C.rock, C.rockDark, C.barkDark);
  }
  prism(ctx, { x, y, w, h, z: SEAT_Z + 1, z0: SEAT_Z - 2 }, C.rockLight, C.rock, C.rockDark);
  const m = iso(x + w * 0.3, y + h * 0.5, SEAT_Z + 1);
  pixels(
    ctx,
    [
      [m.x, m.y, 4, 1],
      [m.x + 6, m.y + 2, 2, 1],
    ],
    C.mossDark,
  );
}

// One boulder with a lit face and a shaded flank; stacked slabs read as a heap
function rock(ctx, d) {
  const b = iso(d.x, d.y),
    s = d.size ?? 1;
  const at = (pts) => pts.map(([x, y]) => ({ x: b.x + x * s, y: b.y + y * s }));
  shadow(ctx, d.x + 0.2, d.y + 0.2, 15 * s, 5 * s, 14 * s);
  poly(
    ctx,
    at([
      [-13, 1],
      [-12, -5],
      [-7, -11],
      [1, -13],
      [8, -10],
      [13, -4],
      [12, 2],
      [4, 4],
      [-7, 4],
    ]),
    C.rockDark,
  );
  poly(
    ctx,
    at([
      [-12, -5],
      [-7, -11],
      [1, -13],
      [5, -8],
      [-1, -3],
      [-9, -1],
    ]),
    C.rock,
  );
  poly(
    ctx,
    at([
      [-7, -11],
      [1, -13],
      [-1, -9],
      [-6, -8],
    ]),
    C.rockLight,
  );
  pixels(
    ctx,
    at([
      [3, -2],
      [-10, 0],
    ]).map((p) => [p.x, p.y, 3 * s, 1]),
    C.mossDark,
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

// A crate as the approved art draws it: a lit lid of three planks, plank faces held in a paler frame, a brace on
// the near face, and a nail where frame pieces meet
function crates(ctx, d) {
  shadow(ctx, d.x + 0.3, d.y + 0.3, 20, 7, 20);
  const S = 0.6,
    H = 10;
  const box = (x, y, z0) => {
    const z = z0 + H;
    // u runs along a surface and v across it, both from 0 to 1
    const lid = (u, v) => iso(x + u * S, y + v * S, z),
      near = (u, v) => iso(x + u * S, y + S, z0 + v * H),
      side = (u, v) => iso(x + S, y + u * S, z0 + v * H);
    const patch = (at, u0, u1, v0, v1, fill) => poly(ctx, [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)], fill);
    const nail = (at, u, v) => {
      const p = at(u, v);
      ctx.fillStyle = C.iron;
      ctx.fillRect(p.x - 0.4, p.y - 0.4, 0.8, 0.8);
    };
    prism(ctx, { x, y, w: S, h: S, z, z0 }, C.woodLight, C.woodDark, C.woodDeep, () => {
      for (const v of [1 / 3, 2 / 3]) patch(lid, 0.04, 0.96, v - 0.025, v + 0.025, C.woodDark);
      for (const [at, frame, seam] of [
        [near, C.wood, C.woodDeep],
        [side, C.woodDark, C.barkDark],
      ]) {
        for (const v of [0.37, 0.63]) patch(at, 0, 1, v - 0.03, v + 0.03, seam);
        if (at === near) {
          // The brace runs from the top of the far post down to the foot of the near one
          poly(ctx, [at(0.08, 0.8), at(0.22, 0.88), at(0.92, 0.2), at(0.78, 0.12)], frame);
          poly(ctx, [at(0.78, 0.12), at(0.92, 0.2), at(0.92, 0.15), at(0.8, 0.08)], seam);
        }
        patch(at, 0, 1, 0.86, 1, frame);
        patch(at, 0, 1, 0, 0.14, frame);
        patch(at, 0, 0.1, 0, 1, frame);
        patch(at, 0.9, 1, 0, 1, frame);
        for (const [u, v] of [
          [0.05, 0.07],
          [0.95, 0.07],
          [0.05, 0.93],
          [0.95, 0.93],
        ])
          nail(at, u, v);
      }
      for (const [u, v] of [
        [0.08, 0.08],
        [0.92, 0.08],
        [0.08, 0.92],
        [0.92, 0.92],
      ])
        nail(lid, u, v);
    });
  };
  box(d.x - 0.65, d.y - 0.3, 0);
  box(d.x, d.y - 0.3, 0);
  box(d.x - 0.35, d.y - 0.3, 10);
}

function hay(ctx, d) {
  const x = d.x - 0.5,
    y = d.y - 0.3;
  shadow(ctx, d.x + 0.25, d.y + 0.25, 18, 6, 15);
  prism(ctx, { x, y, w: 1, h: 0.6, z: 10 }, C.hay, C.hayDark, C.hayDeep);
  // Straw runs along the bale, and two twine bands hold it
  for (const z of [3, 6.5]) line(ctx, iso(x + 0.05, y + 0.6, z), iso(x + 0.95, y + 0.6, z), C.hayDeep);
  for (const k of [0.3, 0.7]) {
    line(ctx, iso(x + k, y + 0.6, 0), iso(x + k, y + 0.6, 10), C.woodDeep);
    line(ctx, iso(x + k, y + 0.6, 10), iso(x + k, y, 10), C.hayDeep);
  }
  const t = iso(x + 0.3, y + 0.3, 10);
  pixels(
    ctx,
    [
      [t.x, t.y, 3, 1],
      [t.x + 6, t.y + 2, 2, 1],
      [t.x - 5, t.y + 1, 2, 1],
    ],
    C.hayDark,
  );
}

function woodpile(ctx, d) {
  shadow(ctx, d.x + 0.25, d.y + 0.25, 18, 6, 15);
  prism(ctx, { x: d.x - 0.25, y: d.y - 0.6, w: 0.5, h: 1.2, z: 12 }, C.bark, C.bark, C.barkDark);
  // Log ends face the camera in a stack of three under two
  for (const [t, z] of [
    [0.2, 3],
    [0.6, 3],
    [1, 3],
    [0.4, 9],
    [0.8, 9],
  ]) {
    // A cut end is pale wood inside dark bark, with a growth ring; a square centre reads as a bolt
    const p = iso(d.x + 0.25, d.y - 0.6 + t, z);
    oval(ctx, p.x, p.y, 3.2, 3.2, C.barkDark);
    oval(ctx, p.x, p.y, 2.4, 2.4, C.wood);
    ctx.strokeStyle = C.woodDark;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.3, 0, TAU);
    ctx.stroke();
  }
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
