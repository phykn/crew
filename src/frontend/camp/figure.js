import { iso } from './projection.js';

// A person stands this many world pixels before the camp's scale, whatever resolution their sprite is painted at
export const FIGURE = { w: 16, h: 26 };
export const BIG = 1.6;
// Sitting on the ground, a person is this many rows from the crown to the crossed legs
const SITTING = 22;
export const headTop = (p) => iso(p.x, p.y).y - (p.sitting ? SITTING : FIGURE.h) * BIG;

// A worker casts wherever they stand once they stop walking
export const isCasting = (p) => p.state === 'working' && !p.path.length && !p.sitting;

// A piece is painted by the middle of its footprint, so a long log sorts against people by their centre
export const depthOf = (d) => d.x + (d.w || 0) / 2 + d.y + (d.h || 0) / 2;
