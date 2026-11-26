export const ROWS = 30;
export const FIRE = { x: 15, y: 15 };
// People keep to the trodden ground around the fire
export const GROUND = 9.2;

const around = (deg, d) => ({
  x: FIRE.x + d * Math.cos((deg * Math.PI) / 180),
  y: FIRE.y + d * Math.sin((deg * Math.PI) / 180),
});
const place = (kind, deg, d, more) => ({ kind, ...around(deg, d), ...more });

// Seats round the fire, each a rug a person sits on cross-legged, far enough apart that two sitters never crowd
export const RUGS = [15, 85, 155, 225, 295].map((deg) => around(deg, 3.3));

export const TORCHES = [...Array(6)].map((_, i) => around(30 + i * 60, 7.6));
// A torch's cup stands this high, a little over everyone's heads, with its flame on top
export const TORCH_TOP = 50;

// r is how far around a piece nobody walks
export const PROPS = [
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
];

const SOLID = [
  { ...FIRE, r: 1.7 },
  // Wide enough that nobody stands with the pole through their body
  ...TORCHES.map((t) => ({ ...t, r: 0.6 })),
  ...PROPS.map((d) => ({ x: d.x + (d.w || 0) / 2, y: d.y + (d.h || 0) / 2, r: d.r })),
];
export const blocked = (x, y) =>
  Math.hypot(x - FIRE.x, y - FIRE.y) > GROUND || SOLID.some((s) => Math.hypot(x - s.x, y - s.y) < s.r + 0.35);

// Every ridge runs along y, so each tent's open end faces the camera and the fire behind it
const TENTS = [place('tent', 227, 11.8), place('tent', 256, 11.4), place('tent', 302, 11.4)];
const TENT_LANTERNS = TENTS.map((t) => ({ kind: 'lantern', x: t.x + 1, y: t.y + 1.9 }));
// Three staggered rows with a fixed rhythm of heights read as a treeline, not scatter
const TREELINE = [0, 1, 2].flatMap((row) =>
  [...Array(14)].map((_, i) =>
    place('pine', 160 + row * 4.5 + i * 10, 13.6 + row * 1.5, { size: [1.15, 0.9, 1.3, 1, 0.85][(i + row * 2) % 5] }),
  ),
);
const grove = (deg, d, sizes) => sizes.map((size, i) => place('pine', deg + (i - 1) * 5, d + (i % 2) * 1.2, { size }));

// The near side, at the screen's bottom, holds only low pieces in a set rhythm: a supply corner, a woodpile corner, a
// lantern between them, and a hedge of ferns and tufts along the edge, so it reads full and tended without hiding anyone
const LOW_LANTERNS = [0, 45, 90].map((deg) => ({ kind: 'lantern', ...around(deg, 9.8) }));
export const LANTERNS = [...TENT_LANTERNS, ...LOW_LANTERNS];
const NEAR = [
  place('crates', 22, 10),
  place('drum', 15, 10.5),
  place('drum', 29, 10.6),
  place('woodpile', 70, 10),
  place('hay', 78, 10.6),
  place('hay', 63, 10.7),
  ...[-30, -15, 8, 37, 53, 100, 115, 130].map((deg, i) => place('fern', deg, 10.6 + (i % 2) * 0.5)),
  ...[-22, 0, 45, 60, 85, 108, 122].map((deg, i) => place('tuft', deg, 10.1 + (i % 2) * 0.4)),
  place('rock', 45, 10.9, { size: 0.8 }),
  place('rock', 92, 11, { size: 0.7 }),
  // A second, looser row further out fills the bottom of a tall window
  ...[-5, 20, 32, 58, 72, 96].map((deg, i) => place('fern', deg, 12 + (i % 2) * 0.6)),
  ...[10, 45, 84].map((deg) => place('tuft', deg, 11.8)),
  place('rock', 40, 12.6, { size: 1 }),
  place('rock', 66, 12.4, { size: 0.6 }),
];

// Tall pieces past the trodden ground keep to the far side and the screen edges, so nothing hides the camp
export const WILDS = [
  ...TENTS,
  ...TENT_LANTERNS,
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
  place('fern', 186, 10.6),
  place('fern', 286, 10.4),
  place('rock', 310, 10.3, { size: 0.6 }),
  ...[150, 170, 344, 356].map((deg, i) => place('tuft', deg, 10.2 + (i % 2) * 0.4)),
  ...LOW_LANTERNS,
  ...NEAR,
];
