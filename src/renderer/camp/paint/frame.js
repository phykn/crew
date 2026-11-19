import { DECOR, FIRE, TORCHES, WILDS } from '../layout.js';
import { iso } from '../projection.js';
import { drawPerson, drawSeal, drawSpell, isCasting } from './people.js';
import { drawDecor, depthOf } from './decor.js';
import { drawTorch, drawFire } from './fire.js';
import { drawGlow, drawDarkness } from './lighting.js';
import { drawOffline, drawOverheads } from './labels.js';

// ground and dark are the canvases made for this view; what lies past the view is left out once, not every frame
export function createPainter(ground, dark, view) {
  // A piece counts while any of it can show: crowns rise up to 70px above the base
  const shows = d => { const p = iso(d.x, d.y); return p.x > view.x - 40 && p.x < view.x + view.w + 40 && p.y > view.y && p.y < view.y + view.h + 70; };
  const pieces = [...DECOR, ...WILDS.filter(shows)];

  // trouble: why the record cannot be read, or null; the fire burns only while it can, and the line says why it went out
  return function drawFrame(ctx, people, now, still, trouble) {
    const lit = !trouble;
    ctx.drawImage(ground, view.x, view.y, view.w, view.h);
    // Painter's order by depth (x + y) keeps everyone behind what stands in front of them
    const items = [
      ...TORCHES.map((t, i) => ({ depth: t.x + t.y, draw: () => drawTorch(ctx, t, i, now, still) })),
      ...pieces.map(d => ({ depth: depthOf(d), draw: () => drawDecor(ctx, d) })),
      { depth: FIRE.x + FIRE.y, draw: () => drawFire(ctx, now, still, lit) },
    ];
    // Someone sitting is painted right after their bench, whatever their exact spot on it;
    // a spell lies on the ground, so it is painted just before its caster stands on it
    for (const p of people.values()) items.push({ depth: p.sitting ? depthOf(p.seat.bench) + 0.01 : p.x + p.y, draw: () => {
      const casting = isCasting(p);
      if (casting) drawSpell(ctx, p, now, still);
      drawPerson(ctx, p, now, still);
      if (casting) drawSeal(ctx, p, now, still);
    } });
    items.sort((a, b) => a.depth - b.depth).forEach(i => i.draw());

    drawGlow(ctx, people, now, still, lit);
    drawDarkness(ctx, dark, view, people, lit);
    drawOverheads(ctx, people.values(), now, still, view.y);
    if (trouble) drawOffline(ctx, trouble);
  };
}
