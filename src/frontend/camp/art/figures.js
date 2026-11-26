import { FIGURE } from '../figure.js';
import { iso } from '../projection.js';
import { outline } from './finish.js';

// A person is a hand-placed pixel picture at the size the camp shows them; each letter names a material and a shade,
// so one picture dresses every role in its own colors, and the fire lights the edge of the figure turned toward it

// Each material's shades from darkest to lightest; a letter picks one, and firelight steps it up
const SHARED = {
  skin: ['#8a4530', '#b8663f', '#e0925f', '#f2b582', '#f7c99a'],
  eye: ['#19191f', '#19191f', '#b8681a', '#d08a30', '#fcf5e8'],
  gold: ['#5e4118', '#8e6428', '#bf8d3a', '#dcae58', '#f2c97a'],
  ivory: ['#7d6c60', '#ab9989', '#c9b8a4', '#ddcdb9', '#faf1e2'],
  boot: ['#2a1a12', '#3a2318', '#6a412e', '#9a6a48', '#b07f5a'],
};

// What each role wears; the materials not named here are shared
const PEOPLE = {
  interpreter: {
    hair: ['#3f3439', '#6e5f66', '#a6989b', '#ddd2cc', '#eee6e0'],
    coat: ['#182628', '#243638', '#3d5a57', '#5a8077', '#6a9286'],
    scarf: ['#53261f', '#82382e', '#ab4f44', '#d4866a', '#e0a084'],
    legs: ['#13141b', '#1b1d29', '#2b2e40', '#3e4359', '#4d536b'],
  },
};

// A letter is a material and its shade
const KEY = {
  J: ['hair', 0],
  j: ['hair', 1],
  h: ['hair', 2],
  H: ['hair', 3],
  q: ['skin', 0],
  z: ['skin', 1],
  s: ['skin', 2],
  S: ['skin', 3],
  k: ['eye', 0],
  a: ['eye', 2],
  w: ['eye', 4],
  d: ['coat', 1],
  c: ['coat', 2],
  C: ['coat', 3],
  g: ['gold', 2],
  G: ['gold', 4],
  y: ['ivory', 1],
  i: ['ivory', 3],
  I: ['ivory', 4],
  r: ['scarf', 2],
  R: ['scarf', 3],
  m: ['legs', 1],
  n: ['legs', 2],
  N: ['legs', 3],
  v: ['boot', 1],
  b: ['boot', 2],
  B: ['boot', 3],
};

// Standing, facing the viewer's lower left: hair swept up and to the right, a coat open over a shirt and a scarf, gold
// trim, a belt with a pouch, puffed cuffs, trousers, and tall boots
const STANDING = [
  '...........Hh....Hh.......',
  '.........hHHhh..hHhj......',
  '........hHHHhhhhHhhjj.....',
  '.......hHHhhhhhhhhhjjj....',
  '......hHHhhhjhhhhhhhjj....',
  '.....hHhhhhjhhhhhhjhjjj...',
  '.....hhhhhjhhhhhhjjhjjj...',
  '....hhhhhjjhhhhjjjhjjjj...',
  '....hhhjjsshhjjsssjjjj....',
  '....hhjsSSssjssssszjjj....',
  '.....hjSSSssssssszzjj.....',
  '.....hjSkkSssskkszzj......',
  '......jSawSsssawzzz.......',
  '......sSSSssssssszz.......',
  '.......SSsssqqsszz........',
  '........ssssssszz.........',
  '.........iIzzzzi..........',
  '......ccCiIrrriicc........',
  '.....cCCcgIrrrrgccd.......',
  '....cCCCcgIirrigcccd......',
  '....CCcccgIiirigccdd......',
  '....CCcc.gIiiiigcd.dd.....',
  '....CCcc.gIiiiigcd.dd.....',
  '...IIIic.gIiiiigcdiiid....',
  '...IIiiy.bbbBbbbbdiiyy....',
  '....SSs.cbbBGbbbbdzsz.....',
  '....SSs.ccgIiiigcbbzz.....',
  '....sss.ccgIiiigcbbzz.....',
  '........gggggggggggg......',
  '.........NNnnmmnnmm.......',
  '.........NNnnm.nnmm.......',
  '.........NNnnm.nnmm.......',
  '.........NNnm..nnmm.......',
  '.........NNnm..nnmm.......',
  '.........NNnm..nnmm.......',
  '........BBBbb.BBbbv.......',
  '........bbbbv.bbbbv.......',
  '.........Bbbv..Bbbv.......',
  '.........Bbbv..Bbbv.......',
  '.......BBbbbv.Bbbbv.......',
  '......Bbbbbbv.bbbbbv......',
  '......vvvvvvv.vvvvvv......',
];

// The picture's size, with a pixel of room on every side for the outline
export const PERSON_W = STANDING[0].length + 2,
  PERSON_H = STANDING.length + 2;

const channels = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
// A shade a little toward the flames' color
const warm = ([r, g, b]) => [r + (255 - r) * 0.18, g + (170 - g) * 0.18, b + (90 - b) * 0.18];

// fire: the screen side the fire is on (-1 left, 1 right, 0 none); the figure's two pixels nearest it along each row
// warm, the outer one a shade lighter, short of the lightest, and the outermost pixel on the other side a shade darker
function paint(role, fire) {
  const look = { ...SHARED, ...PEOPLE[role] },
    img = new ImageData(PERSON_W, PERSON_H);
  STANDING.forEach((row, y) => {
    const cells = [...row].map((ch, x) => [ch, x]).filter(([ch]) => ch !== '.');
    cells.forEach(([ch, x], n) => {
      const [mat, shade] = KEY[ch],
        // How far this pixel is from the row's edge on the fire's side, and on the far side
        near = fire < 0 ? n : fire > 0 ? cells.length - 1 - n : Infinity,
        far = fire < 0 ? cells.length - 1 - n : fire > 0 ? n : Infinity;
      const step = near === 0 ? Math.max(shade, Math.min(3, shade + 1)) : far === 0 ? Math.max(0, shade - 1) : shade;
      const rgb = channels(look[mat][step]);
      img.data.set([...(near <= 1 ? warm(rgb) : rgb), 255], ((y + 1) * PERSON_W + x + 1) * 4);
    });
  });
  outline(img.data, PERSON_W, PERSON_H, [20, 16, 14], 235);
  const canvas = new OffscreenCanvas(PERSON_W, PERSON_H);
  canvas.getContext('2d').putImageData(img, 0, 0);
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
