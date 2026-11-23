import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import gsap from 'gsap';
import { FIRE } from '../layout.js';
import { iso } from '../projection.js';
import { COLOR as C } from '../tokens.js';
import { BIG, FIGURE, depthOf, headTop, isCasting } from '../figure.js';
import { SEALS, SPRITE_SCALE, litFor, spriteFor } from '../art/sprites.js';
import { blotTexture } from './light';
import { textureOf } from './bake';

export type Person = {
  room: { team: string; name: string; color: string; look: string[] };
  x: number;
  y: number;
  facing: number;
  moving?: boolean;
  sitting?: boolean;
  seat?: { bench: { x: number; y: number; w?: number; h?: number } };
  path: unknown[];
  state: string | null;
  bubble?: { text: string; kind: string; until: number } | null;
  checkUntil?: number;
  doing?: string;
  lift?: number;
};

// Feet pass each other between steps, so each leg gets its own frame
const STRIDE = ['stand', 'walkL', 'stand', 'walkR'];
// Legs move with the ground covered, not the clock, so a walker speeding up or slowing down never skates; tiles per frame
const STEP = 0.2;
const TAU = Math.PI * 2;
const hex = (c: string) => parseInt(c.slice(1), 16);

function poseOf(p: Person, now: number, stride: number) {
  if (p.sitting) return 'sit';
  if (isCasting(p)) return SEALS[Math.floor(now / 500) % SEALS.length];
  return p.moving ? STRIDE[Math.floor(stride / STEP) % STRIDE.length] : 'stand';
}

// Each painted pose becomes a texture once; pixels stay square when scaled up
const made = new WeakMap<HTMLCanvasElement, Texture>();
const textureFor = (canvas: HTMLCanvasElement) => {
  if (!made.has(canvas)) made.set(canvas, textureOf(canvas, 1, true));
  return made.get(canvas)!;
};

// One person on the stage: the spell on the ground, the spot under the feet, the figure, and the seal in the hands
export class PersonView {
  root = new Container();
  spell = new Graphics();
  spot = new Sprite(blotTexture(0.7));
  // The plain figure and its firelit copy over it, turned and scaled together
  figure = new Container();
  body = new Sprite();
  lit = new Sprite();
  seal = new Graphics();
  // Breath is a slow rise and fall while standing
  breath = 0;
  stride = 0;
  at: { x: number; y: number } | null = null;
  breathing = gsap.to(this, {
    breath: 1,
    duration: 1.4 + Math.random() * 0.6,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });
  constructor(layer: Container) {
    this.spot.anchor.set(0.5);
    this.spot.tint = 0x000000;
    this.spot.alpha = 0.5;
    this.spot.width = 20.4;
    this.spot.height = 7.2;
    this.body.anchor.set(0.5, 1);
    this.lit.anchor.set(0.5, 1);
    this.figure.addChild(this.body, this.lit);
    this.root.addChild(this.spell, this.spot, this.figure, this.seal);
    layer.addChild(this.root);
  }

  draw(p: Person, now: number) {
    const f = iso(p.x, p.y),
      casting = isCasting(p);
    // Someone sitting is drawn right after their bench, whatever their exact spot on it
    this.root.zIndex = p.sitting && p.seat ? depthOf(p.seat.bench) + 0.01 : p.x + p.y;
    this.spot.visible = !p.sitting;
    this.spot.position.set(f.x, f.y);
    if (this.at) this.stride += Math.hypot(p.x - this.at.x, p.y - this.at.y);
    this.at = { x: p.x, y: p.y };
    const flip = p.facing < 0 ? -1 : 1;
    const pose = poseOf(p, now, this.stride),
      // The fire's side on screen, turned into the sprite's own side when it is drawn mirrored
      toward = (Math.sign(iso(FIRE.x, FIRE.y).x - f.x) || 1) * flip,
      // A walker rises a little as each leg passes the other; someone standing breathes
      bob = p.moving ? -Math.abs(Math.sin((this.stride / STEP) * (Math.PI / 2))) : 0,
      breathe = p.moving ? 1 : 1 + 0.025 * this.breath;
    this.body.texture = textureFor(spriteFor(p.room, pose));
    this.figure.position.set(Math.round(f.x), Math.round(headTop(p) + FIGURE.h * BIG + bob));
    this.figure.scale.set((BIG / SPRITE_SCALE) * flip, (BIG / SPRITE_SCALE) * breathe);
    this.lit.texture = textureFor(litFor(p.room, pose, toward));
    this.lit.alpha = Math.max(0, 1 - Math.hypot(p.x - FIRE.x, p.y - FIRE.y) / 10);
    // Someone with nothing to do fades a little, so the eye finds who is at work
    this.figure.alpha = p.state === 'idle' ? 0.85 : 1;
    this.spell.clear();
    this.seal.clear();
    if (casting) {
      drawSpell(this.spell, f, now);
      const y = headTop(p) + 11.5 * BIG;
      this.seal
        .rect(Math.round(f.x) - 1, Math.round(y) - 1, 3, 3)
        .fill({ color: hex(C.spellCore), alpha: 0.55 + 0.35 * Math.sin(now / 160) });
    }
  }

  destroy() {
    this.breathing.kill();
    this.root.destroy({ children: true });
  }
}

// Work is a spell cast on the ground: a rune ring turns at the feet, sends out a pulse every two seconds,
// and sheds motes that rise a little and fade, so nothing above the head moves and the name stays where it is
function drawSpell(g: Graphics, f: { x: number; y: number }, now: number) {
  const rx = 16,
    ry = 6,
    spin = now / 900,
    pulse = 0.75 + 0.25 * Math.sin(now / 180),
    color = hex(C.spell);
  g.ellipse(f.x, f.y, rx, ry).stroke({ width: 1, color, alpha: 0.7 * pulse });
  for (let k = 0; k < 6; k++) {
    const a = -spin + (k * TAU) / 6;
    g.rect(f.x + Math.cos(a) * rx - 1, f.y + Math.sin(a) * ry - 1, 2, 2).fill({ color, alpha: 0.7 * pulse });
  }
  const t = (now % 2000) / 2000,
    r = rx + t * 14;
  g.ellipse(f.x, f.y, r, (r * ry) / rx).stroke({ width: 1, color, alpha: 0.6 * (1 - t) });
  for (let i = 0; i < 8; i++) {
    const m = (now / 1600 + i / 8) % 1,
      a = (i * TAU) / 8 + spin;
    g.rect(
      Math.round(f.x + Math.cos(a) * rx * (1 - m * 0.3)) - 1,
      Math.round(f.y + Math.sin(a) * ry - m * 12) - 1,
      2,
      2,
    ).fill({ color, alpha: 0.8 * (1 - m) });
  }
}
