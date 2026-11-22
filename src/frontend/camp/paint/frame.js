import { DECOR, FIRE, TORCHES, WILDS } from '../layout.js';
import { iso } from '../projection.js';
import { drawPerson, drawSeal, drawSpell, isCasting } from './people.js';
import { drawDecor, depthOf } from './decor.js';
import { drawTorch, drawFire } from './fire.js';
import { createLighting, drawGlow } from './lighting.js';
import { drawOverheads } from './labels.js';

// ground and light are the canvases made for this view; what lies past the view is left out once, not every frame
export function createPainter(ground, light, view) {
  // A piece counts while any of it can show: crowns rise up to 70px above the base
  const shows = (d) => {
    const p = iso(d.x, d.y);
    return p.x > view.x - 40 && p.x < view.x + view.w + 40 && p.y > view.y && p.y < view.y + view.h + 70;
  };
  const pieces = [...DECOR, ...WILDS.filter(shows)];
  // Everything that never moves is drawn once off screen to learn what blocks the light, and where
  const probe = document.createElement('canvas').getContext('2d');
  probe.casters = [];
  for (const d of pieces) drawDecor(probe, d);
  TORCHES.forEach((t, i) => drawTorch(probe, t, i, 0));
  const { drawShade, drawLight } = createLighting(light, probe.casters);

  return function drawFrame(ctx, people, now) {
    ctx.drawImage(ground, view.x, view.y, view.w, view.h);
    drawShade(ctx, people, now);
    // Painter's order by depth (x + y) keeps everyone behind what stands in front of them
    const items = [
      ...TORCHES.map((t, i) => ({ depth: t.x + t.y, draw: () => drawTorch(ctx, t, i, now) })),
      ...pieces.map((d) => ({ depth: depthOf(d), draw: () => drawDecor(ctx, d) })),
      { depth: FIRE.x + FIRE.y, draw: () => drawFire(ctx, now) },
    ];
    // Someone sitting is painted right after their bench, whatever their exact spot on it;
    // a spell lies on the ground, so it is painted just before its caster stands on it
    for (const p of people.values())
      items.push({
        depth: p.sitting ? depthOf(p.seat.bench) + 0.01 : p.x + p.y,
        draw: () => {
          const casting = isCasting(p);
          if (casting) drawSpell(ctx, p, now);
          drawPerson(ctx, p, now);
          if (casting) drawSeal(ctx, p, now);
        },
      });
    items.sort((a, b) => a.depth - b.depth).forEach((i) => i.draw());

    drawLight(ctx, people, now);
    drawGlow(ctx, now);
    drawOverheads(ctx, people.values(), now, view.y);
  };
}
