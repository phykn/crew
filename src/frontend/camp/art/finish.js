// Finishing passes over painted pixels (RGBA rows, as ImageData holds them), kept free of the DOM so tests can run them

const at = (w, x, y) => (y * w + x) * 4;
const solid = (d, w, h, x, y) => x >= 0 && y >= 0 && x < w && y < h && d[at(w, x, y) + 3] > 0;
const same = (d, i, j) => d[i] === d[j] && d[i + 1] === d[j + 1] && d[i + 2] === d[j + 2] && d[i + 3] === d[j + 3];

// Scale2x: each pixel becomes four, and a corner takes its neighbours' colour where two of them agree, so steps along
// a diagonal become a smooth slope instead of a staircase of big squares
export function upscale(src, w, h) {
  const out = new Uint8ClampedArray(w * h * 16),
    W = w * 2;
  const pick = (x, y) => at(w, Math.min(w - 1, Math.max(0, x)), Math.min(h - 1, Math.max(0, y)));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = pick(x, y),
        a = pick(x, y - 1),
        b = pick(x + 1, y),
        c = pick(x - 1, y),
        d = pick(x, y + 1);
      // A corner borrows a neighbour's colour only where the two neighbours beside it match and the others do not
      const corners = [
        same(src, c, a) && !same(src, c, d) && !same(src, a, b) ? a : p,
        same(src, a, b) && !same(src, a, c) && !same(src, b, d) ? b : p,
        same(src, d, c) && !same(src, d, b) && !same(src, c, a) ? c : p,
        same(src, b, d) && !same(src, b, a) && !same(src, d, c) ? d : p,
      ];
      corners.forEach((from, k) => out.set(src.subarray(from, from + 4), at(W, x * 2 + (k & 1), y * 2 + (k >> 1))));
    }
  return out;
}

// A dark line round the figure keeps it apart from the ground and from anyone standing behind
export function outline(d, w, h, rgb = [18, 14, 10], alpha = 220) {
  const edge = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (
        !solid(d, w, h, x, y) &&
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].some(([dx, dy]) => solid(d, w, h, x + dx, y + dy))
      )
        edge.push(at(w, x, y));
  for (const i of edge) d.set([...rgb, alpha], i);
  return d;
}

// Light comes from above: the top edge of each shape catches it and the bottom edge falls into shade
export function rim(d, w, h, light = 1.18, dark = 0.78) {
  const scale = (i, f) => {
    for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, d[i + k] * f);
  };
  const top = [],
    bottom = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (solid(d, w, h, x, y)) {
        if (!solid(d, w, h, x, y - 1)) top.push(at(w, x, y));
        else if (!solid(d, w, h, x, y + 1)) bottom.push(at(w, x, y));
      }
  top.forEach((i) => scale(i, light));
  bottom.forEach((i) => scale(i, dark));
  return d;
}

// Wood, stone, and canvas are never one flat colour: a fixed seed scatters a little light and dark over every pixel
export function grain(d, seed = 7, amount = 0.08) {
  let s = seed;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    s = (s * 16807) % 2147483647;
    const f = 1 + (s / 2147483647 - 0.5) * 2 * amount;
    for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, d[i + k] * f);
  }
  return d;
}
