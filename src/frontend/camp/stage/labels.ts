import { Container, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import { CAMP, iso } from '../projection.js';
import { COLOR as C, FONT } from '../tokens.js';
import { headTop } from '../figure.js';
import type { Person } from './people';

// One line per person, the name and what they say together, centred over the head
const LINE = 16;
const SAID_MAX = 26;
// A label pushed up by its neighbours glides there over a few frames instead of jumping
const EASE = 0.25;
const hex = (c: string) => parseInt(c.slice(1), 16);
const BAR: Record<string, number> = { work: hex(C.goldDim), rework: hex(C.blood), chat: hex(C.iron) };
type Rect = { l: number; r: number; t: number; b: number };

// A passing remark wins for its three seconds; otherwise a worker shows the step they are on
function speechOf(p: Person, now: number) {
  if (p.bubble && p.bubble.until > now) return p.bubble;
  if (p.state === 'working') return { text: p.doing || '작업 중…', kind: 'work' };
  // 통역 waiting on the user's answer keeps a ? over the head until it comes
  return p.doing ? { text: p.doing, kind: 'chat' } : null;
}

// A soft dark edge keeps small text readable on both grass and firelight
const text = (size: number, weight: '700' | '800', resolution: number, edge: boolean) =>
  new Text({
    text: '',
    resolution,
    style: {
      fontFamily: FONT.base,
      fontSize: size,
      fontWeight: weight,
      fill: 0xffffff,
      ...(edge && { stroke: { color: 0x000000, alpha: 0.75, width: 2.5, join: 'round' as const } }),
    },
  });

class Label {
  root = new Container();
  plate = new Graphics();
  name: Text;
  check: Text;
  said: Text;
  // Something newly said, or a ✓ that just came, pops out from the head instead of appearing all at once
  pop = 1;
  popping: gsap.core.Tween | null = null;
  constructor(layer: Container, resolution: number) {
    this.name = text(10, '800', resolution, true);
    this.check = text(10, '800', resolution, true);
    this.said = text(9, '700', resolution, false);
    this.check.text = ' ✓';
    this.check.tint = hex(C.moss);
    this.root.addChild(this.plate, this.name, this.check, this.said);
    layer.addChild(this.root);
  }
}

// Labels of people standing close would print over each other, so whoever is further back lifts theirs until it clears
export function createLabels(layer: Container, resolution: number, edge: number) {
  const labels = new Map<Person, Label>();
  const set = (t: Text, s: string) => t.text !== s && (t.text = s);

  function place(p: Person, l: Label, now: number, taken: Rect[]) {
    const f = iso(p.x, p.y),
      checked = (p.checkUntil ?? 0) > now,
      b = speechOf(p, now),
      said = b ? ' ' + (b.text.length > SAID_MAX ? b.text.slice(0, SAID_MAX) + '…' : b.text) : '';
    set(l.name, p.room.name);
    if ((said && said !== l.said.text) || (checked && !l.check.visible)) {
      l.popping?.kill();
      l.popping = gsap.fromTo(l, { pop: 0.6 }, { pop: 1, duration: 0.35, ease: 'back.out(2.5)' });
    }
    set(l.said, said);
    const nameW = l.name.width - 2.5,
      checkW = checked ? l.check.width - 2.5 : 0,
      w = nameW + checkW + (said ? l.said.width : 0),
      x = Math.min(Math.max(f.x - w / 2, CAMP.x + 6), CAMP.x + CAMP.w - 6 - w),
      head = headTop(p) - 4,
      box = { l: x - 4, r: x + w + 4, t: head - LINE, b: head },
      quiet = b?.kind === 'idle';
    // Someone saying nothing, or only chatting, gives way: their name is in the legend, and a crowd of names would stack into a tower
    if (
      (!said || quiet) &&
      !checked &&
      taken.some((o) => o.l < box.r && box.l < o.r && o.t < box.b + LINE * 2 && box.t < o.b)
    )
      return (l.root.visible = false);
    l.root.visible = true;
    for (let hit; (hit = taken.find((o) => o.l < box.r && box.l < o.r && o.t < box.b && box.t < o.b)); ) {
      const up = box.b - hit.t + 1;
      box.t -= up;
      box.b -= up;
    }
    // Someone at the back of the camp would lift their label off the canvas, so it comes down to the top edge like it does at the sides
    const down = Math.max(0, edge + 2 - box.t);
    box.t += down;
    box.b += down;
    taken.push(box);
    const lift = head - box.b;
    p.lift = p.lift === undefined ? lift : p.lift + (lift - p.lift) * EASE;
    const y = head - p.lift,
      top = (t: Text) => y - LINE / 2 - 1 - t.height / 2;
    l.plate.clear();
    if (said && !quiet)
      l.plate
        .rect(box.l, y - LINE, box.r - box.l, LINE)
        .fill({ color: 0x0c0a08, alpha: 0.72 })
        .rect(box.l, y - 2, box.r - box.l, 2)
        .fill(BAR[b!.kind]);
    // The name carries the person's color, which the legend in the corner ties to their role
    l.name.tint = hex(p.room.color);
    l.name.position.set(x - 1.25, top(l.name));
    l.check.visible = checked;
    l.check.position.set(x + nameW - 1.25, top(l.check));
    l.said.tint = b?.kind === 'rework' ? hex(C.bloodBright) : quiet ? hex(C.canvasDark) : hex(C.parchment);
    l.said.position.set(x + nameW + checkW, top(l.said));
    l.root.pivot.set(f.x, y);
    l.root.position.set(f.x, y);
    l.root.scale.set(l.pop);
  }

  return {
    draw(people: Iterable<Person>, now: number) {
      const taken: Rect[] = [],
        here = new Set<Person>();
      for (const p of [...people].sort((a, b) => b.x + b.y - (a.x + a.y))) {
        here.add(p);
        if (!labels.has(p)) labels.set(p, new Label(layer, resolution));
        place(p, labels.get(p)!, now, taken);
      }
      for (const [p, l] of labels)
        if (!here.has(p)) {
          l.popping?.kill();
          l.root.destroy({ children: true });
          labels.delete(p);
        }
    },
  };
}
