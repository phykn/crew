import conductor from './people/conductor.js';
import interpreter from './people/interpreter.js';

// A person is a pixel picture at the size the camp shows them (about two screen pixels to a world pixel), one letter
// a pixel and each letter a shade from the role's colors, darkest first. graphics/characters/trace.py makes them from
// the approved sheets, repainting each part (hair, skin, coat, ...) in a few flat shades so it reads clean at this
// size. The fire lights the edge of the figure turned toward it

// Each role's colors and frames, made by graphics/characters/trace.py from its approved sheets
const PEOPLE = { interpreter, conductor };

const channels = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
// The letters, in the order of a role's colors
const LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
// A shade a little toward the flames' color
const warm = ([r, g, b], f) => [r + (255 - r) * f, g + (170 - g) * f, b + (90 - b) * f];
// The picture's own outline and its darkest shadows stay dark in any light
const DARK = 60;

// fire: the screen side the fire is on (-1 left, 1 right, 0 none); along each row, the first three pixels past the
// outline on that side warm, less the further in, so the light fades in rather than drawing a band
function paint(colors, rows, fire) {
  const W = rows[0].length,
    img = new ImageData(W, rows.length),
    rgb = colors.map(channels);
  rows.forEach((row, y) => {
    const lit = [...row].map((ch) => ch !== '.' && Math.max(...rgb[LETTERS.indexOf(ch)]) > DARK),
      order = fire < 0 ? [...lit.keys()] : [...lit.keys()].reverse();
    const warmth = new Float32Array(W);
    let seen = 0;
    for (const x of fire ? order : []) {
      if (!lit[x]) continue;
      warmth[x] = [0.2, 0.13, 0.06][seen] ?? 0;
      if (++seen === 3) break;
    }
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      img.data.set([...warm(rgb[LETTERS.indexOf(ch)], warmth[x]), 255], (y * W + x) * 4);
    });
  });
  const canvas = new OffscreenCanvas(W, rows.length);
  canvas.getContext('2d').putImageData(img, 0, 0);
  return canvas;
}

const made = new Map();
// One frame of a role's pose with the fire on one side, painted once
export function personPicture(role, pose, frame = 0, fire = 0) {
  const key = `${role}|${pose}|${frame}|${fire}`;
  if (!made.has(key)) {
    const { colors, poses } = PEOPLE[role];
    made.set(key, paint(colors, poses[pose][frame], fire));
  }
  return made.get(key);
}

// How many frames a role's pose has
export const framesOf = (role, pose) => PEOPLE[role].poses[pose].length;
