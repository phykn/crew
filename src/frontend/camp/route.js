import { ROWS, blocked } from './layout.js';

// Paths are found on a half-tile grid of the fixed obstacles, then straightened wherever a direct line is clear
const STEP = 0.5,
  N = ROWS / STEP;
const open = Array.from({ length: N * N }, (_, i) => !blocked((i % N) * STEP, Math.floor(i / N) * STEP));
const cellOf = (p) => Math.round(p.y / STEP) * N + Math.round(p.x / STEP);
const pointOf = (c) => ({ x: (c % N) * STEP, y: Math.floor(c / N) * STEP });
const MOVES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

function isClear(a, b) {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.2);
  for (let i = 1; i < n; i++) if (blocked(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n)) return false;
  return true;
}

// A binary heap keeps the search fast enough to run for every walker step on the frame it is asked
function createQueue() {
  const items = [];
  const swap = (i, j) => {
    [items[i], items[j]] = [items[j], items[i]];
  };
  return {
    get size() {
      return items.length;
    },
    push(cell, rank) {
      items.push([rank, cell]);
      for (let i = items.length - 1, up; i && items[(up = (i - 1) >> 1)][0] > items[i][0]; i = up) swap(i, up);
    },
    pop() {
      const top = items[0],
        last = items.pop();
      if (items.length) {
        items[0] = last;
        for (let i = 0; ; ) {
          const l = 2 * i + 1,
            r = l + 1;
          let low = i;
          if (l < items.length && items[l][0] < items[low][0]) low = l;
          if (r < items.length && items[r][0] < items[low][0]) low = r;
          if (low === i) break;
          swap(i, low);
          i = low;
        }
      }
      return top[1];
    },
  };
}

export function findPath(from, to) {
  if (isClear(from, to)) return [to];
  const start = cellOf(from),
    goal = cellOf(to);
  const guess = (c) => {
    const p = pointOf(c);
    return Math.hypot(p.x - to.x, p.y - to.y);
  };
  const cost = new Map([[start, 0]]),
    back = new Map(),
    done = new Set(),
    todo = createQueue();
  todo.push(start, guess(start));
  while (todo.size) {
    const c = todo.pop();
    if (c === goal) break;
    if (done.has(c)) continue;
    done.add(c);
    for (const [dx, dy] of MOVES) {
      const x = (c % N) + dx,
        y = Math.floor(c / N) + dy,
        next = y * N + x;
      // The goal's cell may count as blocked though the point itself is open, as beside a prop
      if (x < 0 || y < 0 || x >= N || y >= N || (!open[next] && next !== goal)) continue;
      const g = cost.get(c) + Math.hypot(dx, dy) * STEP;
      if (g < (cost.get(next) ?? Infinity)) {
        cost.set(next, g);
        back.set(next, c);
        todo.push(next, g + guess(next));
      }
    }
  }
  if (!back.has(goal)) return null;
  const cells = [goal];
  while (cells[0] !== start) cells.unshift(back.get(cells[0]));
  const pts = [...cells.slice(1, -1).map(pointOf), to];
  // Skipping every corner the walker can see past makes people cut across open ground instead of stepping along the grid
  const out = [];
  for (let i = 0, at = from; i < pts.length; ) {
    let j = pts.length - 1;
    while (j > i && !isClear(at, pts[j])) j--;
    out.push(pts[j]);
    at = pts[j];
    i = j + 1;
  }
  return out;
}
