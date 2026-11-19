import { ROWS, FIRE, GROUND } from './layout.js';

// Floor tiles become 2:1 diamonds; z lifts a point straight up on screen
export const TW = 32, TH = 16;
const TOP = 64;
export const iso = (x, y, z = 0) => ({ x: (x - y + ROWS) * TW / 2, y: (x + y) * TH / 2 + TOP - z });

// The camera fits the ground and the trees at its edge, plus room above for crowns, names and bubbles
export const CAMP = (() => {
  const reach = GROUND + 1.5;
  const pts = [...Array(16)].map((_, i) => iso(FIRE.x + reach * Math.cos(i * Math.PI / 8), FIRE.y + reach * Math.sin(i * Math.PI / 8)));
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const x = Math.min(...xs) - 12, y = Math.min(...ys) - 70;
  return { x, y, w: Math.max(...xs) + 12 - x, h: Math.max(...ys) + 12 - y };
})();
