import { FIRE, GROUND, SEATS, blocked } from './layout.js';
import { findPath } from './route.js';
import { CAMP, TW, iso } from './projection.js';
import { headTop } from './paint/people.js';

// 비서 hands work out, so assignments walk from them
const LEAD = 'orchestrator';

// Small talk follows the user's clock, so a camp at midnight does not plan lunch
const CHAT = {
  morning: ['아침 잘 먹었어요?', '오늘 할 일이 많네요', '커피 한 잔 할까요?'],
  day: ['점심은 뭐 먹을까요?', '오늘도 수고 많아요', '잠깐 쉬었다 할게요'],
  evening: ['저녁은 뭐 먹을까요?', '오늘 하루 길었네요', '모닥불 따뜻하네요'],
  night: ['이제 좀 쉬어야지.', '밤이 깊었네요', '모닥불 따뜻하네요'],
};
export function smallTalk(hour) {
  if (hour >= 5 && hour < 11) return CHAT.morning;
  if (hour >= 11 && hour < 17) return CHAT.day;
  if (hour >= 17 && hour < 22) return CHAT.evening;
  return CHAT.night;
}
const pick = (list) => list[Math.floor(Math.random() * list.length)];
// People never stop closer than this to someone else, in tiles
const SPACE = 1.3;
// How far ahead, in tiles, a walker looks for someone to step around
const AHEAD = 1.2;
const SPEED = { stroll: 1.1, brisk: 3.4 };
// The four screen edges as ground angles: bottom, right, top, left
const SIDES = [Math.PI / 4, -Math.PI / 4, (-3 * Math.PI) / 4, (3 * Math.PI) / 4];
// Gap between one arrival and the next when the crew first walks in, in ms
const ARRIVAL_GAP = 250;

// Everyone in the camp, kept by team: where they stand, where they walk, and what shows over their head
export function createWalkers() {
  const people = new Map();
  let before = null,
    shown = null,
    view = CAMP;

  const others = (p) => [...people.values()].filter((o) => o !== p);
  const endOf = (o) => (o.path.length ? o.path[o.path.length - 1] : o);
  const isFree = (p, s) =>
    !blocked(s.x, s.y) && others(p).every((o) => Math.hypot(endOf(o).x - s.x, endOf(o).y - s.y) > SPACE);
  const faceFire = (p) => Math.sign(FIRE.x - p.x - (FIRE.y - p.y)) || 1;

  function findSpot(p, near, reach) {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2,
        d = Math.sqrt(Math.random()) * (near ? reach : GROUND),
        c = near || FIRE;
      const s = { x: c.x + d * Math.cos(a), y: c.y + d * Math.sin(a) };
      if (isFree(p, s)) return s;
    }
    return null;
  }

  function walk(p, to, fast, end = {}) {
    // Someone on a bench steps off it first, as the bench itself is in the way; someone still outside comes in through their gap first
    const outside = p.entering && Math.hypot(p.x - FIRE.x, p.y - FIRE.y) > GROUND - 0.5,
      via = p.seat ? p.seat.from : outside ? p.door : null,
      path = findPath(via || p, to);
    if (!path) return false;
    const pts = [...(via ? [via] : []), ...path];
    pts[pts.length - 1] = { ...pts[pts.length - 1], ...end };
    Object.assign(p, { path: pts, fast, sitting: false, seat: null, waitUntil: outside ? p.waitUntil : 0 });
    return true;
  }

  // A whole person past the given screen edge, with room for their width
  const outOfSight = (pt) => {
    const f = iso(pt.x, pt.y);
    return headTop(pt) > view.y + view.h || f.y < view.y || f.x < view.x - TW || f.x > view.x + view.w + TW;
  };

  // People come and go through the gap in the trees nearest a screen edge, the bottom one unless told otherwise
  function findDoorway(side = SIDES[0]) {
    for (const turn of [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9]) {
      const a = side + turn,
        at = (d) => ({ x: FIRE.x + d * Math.cos(a), y: FIRE.y + d * Math.sin(a) }),
        gap = at(GROUND - 0.5);
      if (blocked(gap.x, gap.y)) continue;
      let d = GROUND;
      while (!outOfSight(at(d))) d += 0.5;
      return { gap, off: at(d) };
    }
    return null;
  }

  function leave(key, p) {
    const door = findDoorway();
    // Leaving is a stroll, so the 대표 sees them go
    if (!door || !walk(p, door.gap, false)) {
      people.delete(key);
      return;
    }
    p.path.push(door.off);
    Object.assign(p, { leaving: key, state: 'idle', bubble: null });
  }

  function speak(p, text, kind) {
    if (p) p.bubble = { text, kind, until: performance.now() + 3000 };
  }

  // Walk up to the other person, say it, and stay there: a worker then casts on that spot
  function handOff(from, to, text, kind) {
    const p = people.get(from),
      q = people.get(to);
    if (!p || !q || p === q) return;
    // Someone still walking in is met where they are headed
    const at = q.entering ? endOf(q) : q,
      side = Math.atan2(p.y - at.y, p.x - at.x);
    for (const turn of [0, 0.8, -0.8, 1.6, -1.6, Math.PI]) {
      const s = { x: at.x + Math.cos(side + turn), y: at.y + Math.sin(side + turn) };
      if (!blocked(s.x, s.y) && walk(p, s, true, { wait: 2500, say: { text, kind } })) return;
    }
  }

  function idle(p, now) {
    p.nextIdle = now + 4000 + Math.random() * 9000;
    const roll = Math.random();
    if (roll < 0.2) {
      p.facing = -p.facing;
      return;
    }
    if (roll < 0.4) {
      const seat = pick(SEATS.filter((s) => others(p).every((o) => o.seat !== s && endOf(o).seatTo !== s)));
      if (seat) {
        walk(p, seat.from, false, { seatTo: seat });
        return;
      }
    }
    if (roll < 0.55) {
      const q = others(p).find((o) => o.state !== 'working' && !o.path.length && Math.hypot(o.x - p.x, o.y - p.y) < 3);
      if (q) {
        const talk = smallTalk(new Date().getHours());
        speak(p, pick(talk), 'chat');
        speak(q, pick(talk), 'chat');
        return;
      }
    }
    const s = findSpot(p, Math.random() < 0.6 ? p : null, 4);
    if (s) walk(p, s, false);
  }

  // Someone in the way is passed on their open side; where both sides are blocked the walker goes straight on, so nobody is ever stuck
  function steer(p, ux, uy, d) {
    const o = others(p).find((o) => {
      const ox = o.x - p.x,
        oy = o.y - p.y,
        along = ox * ux + oy * uy;
      return along > 0 && along < Math.min(AHEAD, d) && Math.abs(ox * uy - oy * ux) < SPACE / 2;
    });
    if (!o) return [ux, uy];
    const away = Math.sign((o.x - p.x) * uy - (o.y - p.y) * ux) || 1;
    for (const side of [away, -away]) {
      const vx = ux - side * uy,
        vy = uy + side * ux,
        n = Math.hypot(vx, vy);
      if (!blocked(p.x + (vx / n) * 0.3, p.y + (vy / n) * 0.3)) return [vx / n, vy / n];
    }
    return [ux, uy];
  }

  function step(p, now, dt) {
    if (p.state !== 'working' && !p.path.length && !(p.waitUntil > now) && now > p.nextIdle) idle(p, now);
    const q = p.path[0];
    p.moving = false;
    if (!q || p.waitUntil > now) return;
    const dx = q.x - p.x,
      dy = q.y - p.y,
      d = Math.hypot(dx, dy),
      move = (p.fast ? SPEED.brisk : SPEED.stroll) * dt;
    // dx - dy is left-right on the isometric screen
    if (Math.abs(dx - dy) > 0.05) p.facing = Math.sign(dx - dy);
    if (d > move) {
      const [sx, sy] = steer(p, dx / d, dy / d, d);
      p.x += sx * move;
      p.y += sy * move;
      p.moving = true;
      return;
    }
    Object.assign(p, { x: q.x, y: q.y });
    p.path.shift();
    if (q.wait) p.waitUntil = now + q.wait;
    if (q.say) speak(p, q.say.text, q.say.kind);
    if (p.leaving && !p.path.length) people.delete(p.leaving);
    if (!p.path.length) p.entering = false;
    // The last step onto a bench is a hop over its edge, which the path finder would not allow
    if (q.seatTo)
      Object.assign(p, { x: q.seatTo.x, y: q.seatTo.y, seat: q.seatTo, sitting: true, facing: faceFire(q.seatTo) });
  }

  function add(member, entering, key = member.team, side = SIDES[0], delay = 0) {
    const p = {
      room: member,
      x: FIRE.x,
      y: FIRE.y,
      path: [],
      facing: 1,
      state: null,
      nextIdle: performance.now() + Math.random() * 6000,
    };
    people.set(key, p);
    // Anyone arriving walks in from out of sight, briskly so work never waits on them
    const door = entering && findDoorway(side),
      s = findSpot(p),
      inside = door && s && findPath(door.gap, s);
    Object.assign(p, inside ? door.off : s || {});
    if (inside)
      Object.assign(p, {
        path: [door.gap, ...inside],
        door: door.gap,
        fast: true,
        entering: true,
        waitUntil: performance.now() + delay,
      });
    p.facing = faceFire(p);
    return p;
  }

  return {
    people,
    tick(now, dt) {
      for (const p of people.values()) step(p, now, dt);
    },
    fitView(v) {
      view = v;
    },

    // The first crew only records what the page found, so history does not replay as news
    applyStaff(staff) {
      // The window has no crew until a project loads; that empty list is not the crew the page found
      if (before === null && !staff.length) return;
      const now = performance.now(),
        leading = staff.some((s) => s.team === LEAD);
      // A temp whose mission ended, or someone let go, walks out instead of vanishing
      for (const [team, p] of people) if (!p.leaving && !staff.some((s) => s.team === team)) leave(team, p);
      // The crew the app opens with walks in from every edge in turn; anyone hired later comes from the bottom
      const first = before === null;
      staff.forEach((s, i) => {
        if (!people.has(s.team))
          add(s, true, s.team, first ? SIDES[i % SIDES.length] : SIDES[0], first ? i * ARRIVAL_GAP : 0);
      });
      for (const s of staff) {
        // People are kept by team, so a renamed employee keeps walking where they were and only their name tag changes
        const p = people.get(s.team),
          was = before?.[s.team];
        // Hired back on the way out, they simply stay
        if (p.leaving) Object.assign(p, { leaving: null, path: [] });
        p.room = s;
        if (before && leading && s.team !== LEAD && s.state === 'working' && was !== 'working')
          handOff(LEAD, s.team, `${s.name}에게 업무 배정`, 'work');
        if (before && was === 'working' && s.state === 'idle') p.checkUntil = now + 3000;
        if (s.state === 'working' && was !== 'working') {
          // Work starts where the person is: someone strolling stops, someone on a bench stands up
          if (p.seat) Object.assign(p, p.seat.from, { seat: null, sitting: false });
          if (!p.fast) p.path = [];
        }
        p.state = s.state;
      }
      before = Object.fromEntries(staff.map((s) => [s.team, s.state]));
    },

    // The log's sentences stay in the panel; over a worker's head goes only a short word for the step they are on
    applyNow(now) {
      for (const p of people.values()) p.doing = now[p.room.team];
    },

    // Only lines newer than the first call act, so a camp opened late replays nothing; a fresh log, such as another session's, starts over
    applyLog(log, fresh = false) {
      if (fresh) {
        shown = null;
        // Who works there now is where it starts, not news to hand out; nobody already here walks in again
        before = null;
      }
      if (shown !== null)
        for (const line of log.filter((l) => l.id > shown)) {
          if (line.to) handOff(line.who, line.to, line.text, line.kind);
          else speak(people.get(line.who), line.text, line.kind);
        }
      shown = log.length ? Math.max(shown ?? 0, ...log.map((l) => l.id)) : (shown ?? 0);
    },

    // The person drawn at a point on the camp, for clicks
    at(x, y) {
      return (
        [...people.entries()].find(([, p]) => {
          const f = iso(p.x, p.y);
          return Math.abs(x - f.x) < 14 && y < f.y + 4 && y > headTop(p);
        })?.[0] ?? null
      );
    },
  };
}
