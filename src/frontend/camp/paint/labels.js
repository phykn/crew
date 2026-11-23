import { CAMP, iso } from '../projection.js';
import { COLOR as C } from '../tokens.js';
import { font, label } from './shapes.js';
import { headTop } from './people.js';

// One line per person, the name and what they say together, centred over the head
const LINE = 16;
const SAID_MAX = 26;
// A label pushed up by its neighbours glides there over a few frames instead of jumping
const EASE = 0.25;
const BAR = { work: C.goldDim, rework: C.blood, chat: C.iron };
// What is only small talk must not read like the crew's work

// Labels of people standing close would print over each other, so whoever is further back lifts theirs until it clears
export function drawOverheads(ctx, people, now, edge) {
  const taken = [];
  for (const p of [...people].sort((a, b) => b.x + b.y - (a.x + a.y))) drawOverhead(ctx, p, now, taken, edge);
}

// A passing remark wins for its three seconds; otherwise a worker shows the step they are on
function speechOf(p, now) {
  if (p.bubble?.until > now) return p.bubble;
  if (p.state === 'working') return { text: p.doing || '작업 중…', kind: 'work' };
  // 비서 waiting on the user's answer keeps a ? over the head until it comes
  return p.doing ? { text: p.doing, kind: 'chat' } : null;
}

function drawOverhead(ctx, p, now, taken, edge) {
  const f = iso(p.x, p.y),
    checked = p.checkUntil > now,
    b = speechOf(p, now);
  const said = b && ': ' + (b.text.length > SAID_MAX ? b.text.slice(0, SAID_MAX) + '…' : b.text);
  ctx.font = font(10, 800);
  const nameW = ctx.measureText(p.room.name).width,
    checkW = checked ? ctx.measureText(' ✓').width : 0;
  ctx.font = font(9);
  const saidW = said ? ctx.measureText(said).width : 0;
  const w = nameW + checkW + saidW,
    x = Math.min(Math.max(f.x - w / 2, CAMP.x + 6), CAMP.x + CAMP.w - 6 - w);
  const head = headTop(p) - 4;
  const box = { l: x - 4, r: x + w + 4, t: head - LINE, b: head };
  const quiet = b?.kind === 'idle';
  // Someone saying nothing, or only chatting, gives way: their name is in the legend, and a crowd of names would stack into a tower
  if (
    (!said || quiet) &&
    !checked &&
    taken.some((o) => o.l < box.r && box.l < o.r && o.t < box.b + LINE * 2 && box.t < o.b)
  )
    return;
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
  const y = head - p.lift;

  if (said && !quiet) {
    ctx.fillStyle = 'rgba(12, 10, 8, .72)';
    ctx.fillRect(box.l, y - LINE, box.r - box.l, LINE);
    ctx.fillStyle = BAR[b.kind];
    ctx.fillRect(box.l, y - 2, box.r - box.l, 2);
  }
  ctx.textAlign = 'left';
  // The name carries the person's color, which the legend in the corner ties to their role
  ctx.font = font(10, 800);
  label(ctx, p.room.name, x, y - 5, p.room.color);
  if (checked) label(ctx, ' ✓', x + nameW, y - 5, C.moss);
  if (!said) return;
  ctx.font = font(9);
  ctx.fillStyle = b.kind === 'rework' ? C.bloodBright : quiet ? C.canvasDark : C.parchment;
  ctx.fillText(said, x + nameW + checkW, y - 5);
}
