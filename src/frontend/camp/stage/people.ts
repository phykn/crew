import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { FIRE } from '../layout.js';
import { iso } from '../projection.js';
import { PIXEL, SEAT, isCasting } from '../figure.js';
import { anchorOf, framesOf, personPicture } from '../art/figures.js';
import { blotTexture } from './light';
import { textureOf } from './bake';
import { drawWard } from './effects';

export type Person = {
  room: { team: string; name: string; color: string; role: string };
  x: number;
  y: number;
  facing: number;
  moving?: boolean;
  sitting?: boolean;
  path: unknown[];
  state: string | null;
  bubble?: { text: string; kind: string; until: number } | null;
  checkUntil?: number;
  doing?: string;
  lift?: number;
};

// Legs move with the ground covered, not the clock, so a walker speeding up or slowing down never skates; tiles per frame
const STEP = 0.32;
// Casting plays its start once, then loops, and plays its end once when the work stops; ms a frame
const CAST = 180;
// Eyes close for a moment every few seconds, each person on their own beat
const BLINK = { every: 4200, for: 160 };

// Each painted frame becomes a texture once; pixels stay square when scaled
const made = new WeakMap<OffscreenCanvas, Texture>();
const textureFor = (canvas: OffscreenCanvas) => {
  if (!made.has(canvas)) made.set(canvas, textureOf(canvas, 1, true));
  return made.get(canvas)!;
};

// One person on the stage: the ward on the ground, the spot under the feet, and the figure with its firelit copy over it
export class PersonView {
  root = new Container();
  spell = new Graphics();
  spot = new Sprite(blotTexture(0.7));
  // The plain figure and its firelit copy over it, turned and scaled together
  figure = new Container();
  body = new Sprite();
  lit = new Sprite();
  stride = 0;
  at: { x: number; y: number } | null = null;
  blinkAt = Math.random() * BLINK.every;
  // When the current casting began, and when the last one ended
  castFrom: number | null = null;
  castTo: number | null = null;
  constructor(layer: Container) {
    this.spot.anchor.set(0.5);
    this.spot.tint = 0x000000;
    this.spot.alpha = 0.5;
    this.spot.width = 25.5;
    this.spot.height = 9;
    this.figure.addChild(this.body, this.lit);
    this.root.addChild(this.spell, this.spot, this.figure);
    layer.addChild(this.root);
  }

  // Which pose and frame the person shows now
  frame(p: Person, now: number, casting: boolean): [string, number] {
    const role = p.room.role,
      blink = (now + this.blinkAt) % BLINK.every < BLINK.for ? 1 : 0;
    if (casting && this.castFrom === null) [this.castFrom, this.castTo] = [now, null];
    if (!casting && this.castFrom !== null) [this.castFrom, this.castTo] = [null, now];
    if (p.sitting) return ['sit', blink];
    if (p.moving) return ['walk', Math.floor(this.stride / STEP) % framesOf(role, 'walk')];
    if (casting) {
      const k = Math.floor((now - this.castFrom!) / CAST),
        start = framesOf(role, 'castStart');
      return k < start ? ['castStart', k] : ['castLoop', (k - start) % framesOf(role, 'castLoop')];
    }
    const end = this.castTo === null ? Infinity : Math.floor((now - this.castTo) / CAST);
    return end < framesOf(role, 'castEnd') ? ['castEnd', end] : ['idle', blink];
  }

  draw(p: Person, now: number) {
    const f = iso(p.x, p.y),
      casting = isCasting(p);
    this.root.zIndex = p.x + p.y;
    this.spot.visible = !p.sitting;
    this.spot.position.set(f.x, f.y);
    if (this.at) this.stride += Math.hypot(p.x - this.at.x, p.y - this.at.y);
    this.at = { x: p.x, y: p.y };
    // The sheets are drawn facing screen-left, so facing right mirrors them
    const flip = p.facing > 0 ? -1 : 1,
      [pose, k] = this.frame(p, now, casting),
      // The fire's side on screen, turned into the picture's own side when it is drawn mirrored
      toward = (Math.sign(iso(FIRE.x, FIRE.y).x - f.x) || 1) * flip,
      body = personPicture(p.room.role, pose, k);
    this.body.texture = textureFor(body);
    this.lit.texture = textureFor(personPicture(p.room.role, pose, k, toward));
    // The picture stands on its bottom row, over the column under its standing head
    for (const s of [this.body, this.lit]) s.anchor.set((anchorOf(p.room.role) + 0.5) / body.width, 1);
    this.figure.position.set(Math.round(f.x), Math.round(f.y + (p.sitting ? SEAT : 0)));
    this.figure.scale.set(PIXEL * flip, PIXEL);
    this.lit.alpha = Math.max(0, 1 - Math.hypot(p.x - FIRE.x, p.y - FIRE.y) / 10);
    // Someone with nothing to do fades a little, so the eye finds who is at work
    this.figure.alpha = p.state === 'idle' ? 0.85 : 1;
    this.spell.clear();
    if (casting) drawWard(this.spell, f, now);
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}
