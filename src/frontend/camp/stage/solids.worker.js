import { drawProp, placeOf } from '../art/props.js';
import { pictureOf } from '../art/solids.js';

// Paints one prop's solids at each scale asked for, away from the window, and hands back the pictures; the window keeps
// them, so baking the prop there only copies them
self.onmessage = async ({ data: { d, ks, i } }) => {
  const name = placeOf(d),
    pictures = [];
  for (const k of ks) {
    drawProp({ getTransform: () => ({ a: k }), drawImage() {} }, d);
    const p = pictureOf(name, k);
    if (p) pictures.push({ k, dx: p.dx, dy: p.dy, canvas: await createImageBitmap(p.canvas) });
  }
  self.postMessage(
    { name, i, pictures },
    pictures.map((p) => p.canvas),
  );
};
