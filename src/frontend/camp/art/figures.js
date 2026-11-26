import { FIGURE } from '../figure.js';
import { iso } from '../projection.js';
import { outline } from './finish.js';

// A person is painted pixel by pixel at the size the camp shows them, from parts that each say which way every pixel
// faces; the light picks a shade from that, so the fire can light whichever side faces it

// The picture's size, with a pixel of room on every side for the outline
export const PERSON_W = 28,
  PERSON_H = 44;

// Each material's shades from darkest to lightest; a pixel facing the light takes a lighter one
const RAMPS = {
  skin: ['#6a3725', '#b8663f', '#e0925f', '#efa877', '#f7c494'],
  eye: ['#19191f', '#19191f', '#a8580c', '#c87a1e', '#fcf5e8'],
  boot: ['#2a1a12', '#46291d', '#6a412e', '#87573c', '#a8744f'],
  gold: ['#5e4118', '#8e6428', '#bf8d3a', '#dcae58', '#f2c97a'],
  ivory: ['#7d6c60', '#ab9989', '#d3c3b0', '#ebdecb', '#faf1e2'],
};

// Who wears what: hair, coat, scarf, and trousers by role; everything else is shared
const PEOPLE = {
  interpreter: {
    hair: ['#3f3439', '#66575e', '#938489', '#bcaeac', '#ddd2cc'],
    coat: ['#18262a', '#263a3e', '#355150', '#466863', '#5a8077'],
    scarf: ['#53261f', '#82382e', '#ab4f44', '#c4664c', '#d4866a'],
    legs: ['#13141b', '#1d1f2d', '#292c3e', '#363a50', '#454a63'],
  },
};

// Faces: T is a top, L and F the front planes turned to the upper-left light and to the viewer, R the side turned away
const BASE = { T: 3, L: 3, F: 2, R: 1 };
const facing = (left, right) => (x) => (x <= left ? 'L' : x >= right ? 'R' : 'F');

// The interpreter standing, facing the viewer's lower left: silver hair swept up and to the right, a teal coat open
// over an ivory shirt and a coral scarf, gold trim, a belt with a pouch, puffed ivory cuffs, navy trousers, tall boots
function standing(put) {
  const span = (y, x0, x1, mat, face, step = 0) => {
    for (let x = x0; x <= x1; x++) put(x, y, mat, typeof face === 'function' ? face(x) : face, step);
  };
  // Boots: a turned-down cuff, the shaft, and a foot whose toe points left; the sole is the darkest row
  for (const [l, r] of [
    [7, 12],
    [14, 18],
  ]) {
    const side = facing(l + 1, r - 1);
    span(34, l, r, 'boot', 'T', 1);
    span(35, l, r, 'boot', side, 1);
    for (let y = 36; y <= 38; y++) span(y, l + 1, r - 1, 'boot', side);
    for (let y = 39; y <= 40; y++) span(y, l - 2, r - (r > 15 ? 0 : 0), 'boot', y === 39 ? 'T' : side);
    span(41, l - 2, r, 'boot', 'R', -1);
  }
  // Trousers, joined at the hips and parted below
  span(28, 8, 17, 'legs', facing(9, 16));
  span(29, 8, 17, 'legs', facing(9, 16));
  for (let y = 30; y <= 33; y++) {
    span(y, 8, 12, 'legs', facing(9, 12));
    span(y, 14, 17, 'legs', facing(13, 16), -1);
  }
  // The coat: shoulders, a body a little narrower, and a hem that flares; its left side faces the light
  const coat = facing(9, 16);
  span(15, 6, 19, 'coat', 'T');
  for (let y = 16; y <= 24; y++) span(y, 7, 18, 'coat', coat);
  for (let y = 25; y <= 26; y++) span(y, 6, 19, 'coat', coat);
  span(27, 6, 19, 'gold', 'F');
  // The open front: an ivory shirt between two gold edges, and the scarf knotted at the throat
  for (let y = 17; y <= 26; y++) {
    put(10, y, 'gold', 'F');
    put(14, y, 'gold', 'R');
    span(y, 11, 13, 'ivory', facing(11, 13));
  }
  span(15, 10, 14, 'scarf', 'T');
  span(16, 10, 14, 'scarf', facing(11, 13));
  span(17, 11, 13, 'scarf', facing(11, 13));
  span(18, 11, 12, 'scarf', 'F', -1);
  put(12, 19, 'scarf', 'F', -1);
  // A standing collar either side of the scarf
  span(14, 8, 9, 'ivory', 'T');
  span(14, 15, 16, 'ivory', 'R');
  put(8, 15, 'ivory', 'L');
  put(16, 15, 'ivory', 'R');
  // The belt with its buckle, and a pouch on the far hip
  span(22, 7, 18, 'boot', coat);
  span(23, 7, 18, 'boot', coat, -1);
  span(22, 11, 12, 'gold', 'T');
  put(11, 23, 'gold', 'F');
  for (let y = 23; y <= 25; y++) span(y, 15, 17, 'boot', 'R', y === 23 ? 1 : 0);
  // Arms: a teal sleeve, a puffed ivory cuff, and a hand; the far arm is in the shade
  for (const [x0, near] of [
    [3, true],
    [19, false],
  ]) {
    const face = near ? 'L' : 'R';
    for (let y = 15; y <= 19; y++) span(y, x0 + 1, x0 + 3, 'coat', near ? facing(x0 + 1, x0 + 3) : face);
    for (let y = 20; y <= 23; y++) span(y, x0, x0 + 3, 'ivory', near ? facing(x0 + 1, x0 + 3) : face, y === 20 ? 1 : 0);
    span(20, x0, x0 + 3, 'gold', near ? 'T' : 'R');
    for (let y = 24; y <= 26; y++) span(y, x0 + 1, x0 + 3, 'skin', near ? facing(x0 + 1, x0 + 3) : face);
  }
  // Neck in the shade of the chin
  span(14, 10, 14, 'skin', 'R');
  // The face: a rounded oval, its right cheek turned away
  const face = facing(11, 15);
  [
    [6, 8, 16],
    [7, 7, 17],
    [8, 7, 17],
    [9, 7, 17],
    [10, 7, 17],
    [11, 8, 16],
    [12, 9, 15],
    [13, 10, 14],
  ].forEach(([y, a, b]) => span(y, a, b, 'skin', face));
  // Eyes of two pixels under dark brows, the far one narrower; a small mouth
  span(8, 9, 10, 'hair', 'R', -1);
  put(14, 8, 'hair', 'R', -1);
  put(9, 9, 'eye', 'F', -2);
  put(10, 9, 'eye', 'F', -2);
  put(14, 9, 'eye', 'F', -2);
  put(9, 10, 'eye', 'F');
  put(10, 10, 'eye', 'F', 2);
  put(14, 10, 'eye', 'F');
  put(12, 11, 'skin', 'R');
  put(11, 12, 'skin', 'R', -1);
  put(12, 12, 'skin', 'R', -1);
  // An ear on the turned-away side
  put(17, 9, 'skin', 'R');
  put(17, 10, 'skin', 'R', -1);
  // Hair: spikes swept up and to the right, a fringe with a gap on the brow, and locks down the sides
  const hair = facing(10, 17);
  [
    [0, [12, 13], [18, 19]],
    [1, [10, 14], [16, 20]],
    [2, [8, 21]],
    [3, [6, 22]],
    [4, [5, 22]],
    [5, [4, 21]],
    [6, [5, 10], [12, 21]],
    [7, [5, 7], [9, 10], [17, 20]],
    [8, [5, 6], [18, 20]],
    [9, [5, 6], [19, 20]],
    [10, [6, 6], [19, 19]],
  ].forEach(([y, ...runs]) => runs.forEach(([a, b]) => span(y, a, b, 'hair', y <= 2 ? 'T' : hair)));
  // Clumps: the underside of each spike falls a shade, so the hair reads as a few big locks rather than a helmet
  for (const [x, y] of [
    [9, 3],
    [10, 4],
    [14, 3],
    [15, 4],
    [16, 5],
    [19, 3],
    [20, 4],
    [7, 5],
    [8, 6],
  ])
    put(x, y, 'hair', 'R', -1);
  put(4, 4, 'hair', 'L');
  put(23, 2, 'hair', 'T');
  // The fringe throws a little shade on the brow
  span(7, 11, 16, 'skin', 'R');
}

// fire: the screen side the fire is on (-1 left, 1 right, 0 none); the side facing it takes a step of warm light and
// the other a step of shade
function paint(role, fire) {
  const look = { ...RAMPS, ...PEOPLE[role] },
    canvas = new OffscreenCanvas(PERSON_W, PERSON_H),
    ctx = canvas.getContext('2d');
  standing((x, y, mat, face, step) => {
    const toward = fire && ((face === 'L' && fire < 0) || (face === 'R' && fire > 0)),
      away = fire && ((face === 'L' && fire > 0) || (face === 'R' && fire < 0));
    const ramp = look[mat],
      shade = Math.max(0, Math.min(4, BASE[face] + step + (toward ? 1 : 0) - (away ? 1 : 0)));
    ctx.fillStyle = ramp[shade];
    ctx.fillRect(x + 1, y + 1, 1, 1);
  });
  const img = ctx.getImageData(0, 0, PERSON_W, PERSON_H);
  outline(img.data, PERSON_W, PERSON_H, [20, 16, 14], 235);
  ctx.putImageData(img, 0, 0);
  return canvas;
}

const made = new Map();
// A person's picture for a role and a fire side, painted once
export function personPicture(role, fire = 0) {
  const key = `${role}|${fire}`;
  if (!made.has(key)) made.set(key, paint(role, fire));
  return made.get(key);
}

// A person by role, standing at d.x, d.y, as tall as the camp's people
export function drawFigure(ctx, d) {
  const picture = personPicture(d.role, d.fire),
    k = (FIGURE.h * 1.6) / (PERSON_H - 2),
    at = iso(d.x, d.y);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(picture, at.x - (PERSON_W * k) / 2, at.y - (PERSON_H - 1) * k, PERSON_W * k, PERSON_H * k);
  ctx.imageSmoothingEnabled = true;
}
