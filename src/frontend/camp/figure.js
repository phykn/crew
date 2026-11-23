import { iso } from './projection.js';

// A person stands this many world pixels before the camp's scale, whatever resolution their sprite is painted at
export const FIGURE = { w: 16, h: 26 };
export const BIG = 1.6;
// Height of a bench's plank, where a sitting person's hips rest
export const SEAT_Z = 8;
// The sitting pose is the upper body only, resting on the plank
const UPPER = 18;
export const headTop = (p) => iso(p.x, p.y).y - (p.sitting ? SEAT_Z + UPPER * BIG - 2 : FIGURE.h * BIG);

// A worker casts wherever they stand once they stop walking
export const isCasting = (p) => p.state === 'working' && !p.path.length && !p.sitting;

// A piece is painted by the middle of its footprint, so long benches and logs sort against people by their centre
export const depthOf = (d) => d.x + (d.w || 0) / 2 + d.y + (d.h || 0) / 2;
