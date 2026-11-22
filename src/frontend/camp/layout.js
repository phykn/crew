export const ROWS = 30;
export const FIRE = { x: 15, y: 15 };
// People keep to the trodden ground around the fire
export const GROUND = 9.2;

const around = (deg, d) => ({
  x: FIRE.x + d * Math.cos((deg * Math.PI) / 180),
  y: FIRE.y + d * Math.sin((deg * Math.PI) / 180),
});
const place = (kind, deg, d, more) => ({ kind, ...around(deg, d), ...more });

export const TORCHES = [...Array(6)].map((_, i) => around(30 + i * 60, 7.6));

// r is how far around a piece nobody walks; a bench's seats sit on its plank, and `from` is where a person steps on and off it
export const DECOR = [
  // The two pines stand just past the trodden ground, so they are always painted behind everyone
  { kind: 'pine', x: 6.3, y: 10.5, r: 0.6 },
  { kind: 'pine', x: 15.2, y: 5.4, r: 0.6 },
  { kind: 'fern', x: 10.5, y: 8.5, r: 0.6 },
  { kind: 'fern', x: 24, y: 13.5, r: 0.6 },
  { kind: 'fern', x: 12, y: 23, r: 0.6 },
  { kind: 'fern', x: 6.8, y: 16.8, r: 0.6 },
  { kind: 'rock', x: 19.8, y: 6.9, r: 0.5 },
  { kind: 'rock', x: 10.2, y: 19.8, r: 0.5 },
  { kind: 'rock', x: 21.6, y: 20.4, r: 0.5 },
  { kind: 'log', x: 19.6, y: 15.4, w: 1.6, h: 0.5, r: 0.9 },
  { kind: 'crates', x: 11.2, y: 6.9, r: 0.6 },
  { kind: 'drum', x: 12.4, y: 7.7, r: 0.5 },
  { kind: 'well', x: 6.6, y: 13.8, r: 1 },
  {
    kind: 'bench',
    x: 9.7,
    y: 13.6,
    w: 0.6,
    h: 2.2,
    r: 1.2,
    wood: true,
    seats: [
      { x: 10, y: 14.2, from: { x: 11, y: 14.2 } },
      { x: 10, y: 15.3, from: { x: 11, y: 15.3 } },
    ],
  },
  {
    kind: 'bench',
    x: 13.4,
    y: 20,
    w: 2.2,
    h: 0.6,
    r: 1.2,
    seats: [
      { x: 14, y: 20.3, from: { x: 14, y: 19.3 } },
      { x: 15.1, y: 20.3, from: { x: 15.1, y: 19.3 } },
    ],
  },
  {
    kind: 'bench',
    x: 17.8,
    y: 10.6,
    w: 2.2,
    h: 0.6,
    r: 1.2,
    wood: true,
    seats: [
      { x: 18.4, y: 10.9, from: { x: 18.4, y: 11.9 } },
      { x: 19.5, y: 10.9, from: { x: 19.5, y: 11.9 } },
    ],
  },
];
// Each seat knows its bench, so a sitting person is painted just in front of it
export const SEATS = DECOR.flatMap((d) => (d.seats || []).map((s) => Object.assign(s, { bench: d })));

const SOLID = [
  { ...FIRE, r: 1.7 },
  // Wide enough that nobody stands with the pole through their body
  ...TORCHES.map((t) => ({ ...t, r: 0.6 })),
  ...DECOR.map((d) => ({ x: d.x + (d.w || 0) / 2, y: d.y + (d.h || 0) / 2, r: d.r })),
];
export const blocked = (x, y) =>
  Math.hypot(x - FIRE.x, y - FIRE.y) > GROUND || SOLID.some((s) => Math.hypot(x - s.x, y - s.y) < s.r + 0.35);

// Every ridge runs along y, so each tent's open end faces the camera and the fire behind it
const TENTS = [place('tent', 227, 11.8), place('tent', 256, 11.4), place('tent', 302, 11.4)];
export const LANTERNS = TENTS.map((t) => ({ kind: 'lantern', x: t.x + 0.7, y: t.y + 1.4 }));
// Three staggered rows with a fixed rhythm of heights read as a treeline, not scatter
const TREELINE = [0, 1, 2].flatMap((row) =>
  [...Array(14)].map((_, i) =>
    place('pine', 160 + row * 4.5 + i * 10, 13.6 + row * 1.5, { size: [1.15, 0.9, 1.3, 1, 0.85][(i + row * 2) % 5] }),
  ),
);
const grove = (deg, d, sizes) => sizes.map((size, i) => place('pine', deg + (i - 1) * 5, d + (i % 2) * 1.2, { size }));

// Tall pieces past the trodden ground keep to the far side and the screen edges, so nothing hides the camp
export const WILDS = [
  ...TENTS,
  ...LANTERNS,
  ...TREELINE,
  ...grove(92, 14.5, [1.3, 1, 0.8]),
  ...grove(-2, 14.5, [0.9, 1.3, 1]),
  ...grove(140, 12.8, [1, 1.2]),
  ...grove(318, 13.4, [1.1, 0.9]),
  place('wagon', 152, 11),
  place('crates', 212, 10.5),
  place('drum', 240, 10.4),
  place('drum', 244, 10.9),
  place('woodpile', 272, 10.6),
  place('hay', 330, 10.6),
  place('hay', 336, 11.4),
  place('crates', 14, 10.6),
  place('hay', 72, 10.5),
  place('woodpile', 104, 10.7),
  place('fern', 186, 10.6),
  place('fern', 286, 10.4),
  place('fern', 120, 10.8),
  place('fern', 0, 11.6),
  place('rock', 30, 10.7, { size: 0.7 }),
  place('rock', 86, 11.6, { size: 1.1 }),
  place('rock', 310, 10.3, { size: 0.6 }),
  ...[22, 40, 54, 64, 96, 130, 170, 344, 356].map((deg, i) => place('tuft', deg, 10.2 + (i % 3) * 0.4)),
];
