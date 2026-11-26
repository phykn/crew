// Finishing passes over painted pixels (RGBA rows, as ImageData holds them), kept free of the DOM so tests can run them

const at = (w, x, y) => (y * w + x) * 4;
const solid = (d, w, h, x, y) => x >= 0 && y >= 0 && x < w && y < h && d[at(w, x, y) + 3] > 0;

// Light comes from above: the top edge of each shape catches it and the bottom edge falls into shade
export function rim(d, w, h) {
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
  top.forEach((i) => scale(i, 1.1));
  bottom.forEach((i) => scale(i, 0.88));
  return d;
}

// Wood, stone, and canvas are never one flat colour: a fixed seed scatters a little light and dark over every pixel
export function grain(d, seed) {
  let s = seed;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    s = (s * 16807) % 2147483647;
    const f = 1 + (s / 2147483647 - 0.5) * 2 * 0.08;
    for (let k = 0; k < 3; k++) d[i + k] = Math.min(255, d[i + k] * f);
  }
  return d;
}
