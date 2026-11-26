import { iso } from './projection.js';

// A standing person is this many world pixels tall, before the camp's scale
export const FIGURE = { h: 26 };
// Drawn a little larger than the props would make them, so faces and poses read at the camp's size
export const BIG = 2;
// A person's picture has this many rows from crown to soles standing, so each of its pixels is this much of the scene
const STANDING = 82;
export const PIXEL = (FIGURE.h * BIG) / STANDING;
// Sitting cross-legged on the ground, a person's picture is about this many rows from crown to the folded legs
const SITTING = 60;
// A sitter's picture ends at the front of the folded legs, so it is drawn this many of its rows lower to put the
// body, not the knees, over the middle of the rug
export const SEAT = 8 * PIXEL;
export const headTop = (p) => iso(p.x, p.y).y + (p.sitting ? SEAT - SITTING * PIXEL : -STANDING * PIXEL);

// A worker casts wherever they stand once they stop walking
export const isCasting = (p) => p.state === 'working' && !p.path.length && !p.sitting;

// A piece is painted by the middle of its footprint, so a long log sorts against people by their centre
export const depthOf = (d) => d.x + (d.w || 0) / 2 + d.y + (d.h || 0) / 2;
