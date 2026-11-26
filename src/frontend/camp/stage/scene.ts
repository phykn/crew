import { Container, type Renderer, Sprite, type Texture } from 'pixi.js';
import { FIRE, PROPS, TORCHES, WILDS } from '../layout.js';
import { iso } from '../projection.js';
import { depthOf } from '../figure.js';
import { drawProp } from '../art/props.js';
import { keepPicture } from '../art/solids.js';
// Inlined, since the window is a file and a worker loaded from a file is refused
import SolidsWorker from './solids.worker.js?worker&inline';
import { paintGround } from '../art/ground.js';
import { grain, rim } from '../art/finish.js';
import { bake, bakeTight } from './bake';
import { createLight, type Box, type Caster } from './light';
import { createFlames, TORCH_CASTERS } from './effects';
import { createLabels } from './labels';
import { PersonView, type Person } from './people';

type Piece = { kind: string; x: number; y: number; w?: number; h?: number };
type Picture = { k: number; dx: number; dy: number; canvas: ImageBitmap };

// Each piece gets texture in its surfaces, light on its top edges, and less light near the ground, where the sky is hidden
function finish(seed: number) {
  return (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const img = ctx.getImageData(0, 0, w, h);
    rim(grain(img.data, seed), w, h, 1.1, 0.88);
    ctx.putImageData(img, 0, 0);
    const g = ctx.createLinearGradient(0, h * 0.55, 0, h);
    g.addColorStop(0, 'rgba(0, 0, 0, 0)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  };
}

// The whole camp for one size of the window: what never moves is baked once, what moves is updated every frame
export function createScene(renderer: Renderer, box: Box) {
  const view = { x: -box.ox / box.scale, y: -box.oy / box.scale, w: box.w / box.scale, h: box.h / box.scale },
    res = box.scale * box.dpr,
    baked: Texture[] = [];
  // A piece counts while any of it can show: crowns rise up to 70px above the base
  const shows = (d: Piece) => {
    const p = iso(d.x, d.y);
    return p.x > view.x - 40 && p.x < view.x + view.w + 40 && p.y > view.y && p.y < view.y + view.h + 70;
  };
  const pieces: Piece[] = [
    ...PROPS,
    ...TORCHES.map((t: { x: number; y: number }) => ({ ...t, kind: 'torch' })),
    ...WILDS.filter(shows),
  ];

  const root = new Container(),
    world = new Container(),
    items = new Container(),
    top = new Container();
  for (const c of [world, top]) {
    c.position.set(box.ox, box.oy);
    c.scale.set(box.scale);
  }
  items.sortableChildren = true;

  const ground = new Sprite(bake(view, res, (ctx) => paintGround(ctx, view)));
  ground.position.set(view.x, view.y);
  baked.push(ground.texture);

  // Every piece is painted once off screen to learn what blocks the light, and where
  const probe = Object.assign(document.createElement('canvas').getContext('2d')!, { casters: [] as Caster[] });
  for (const d of pieces) drawProp(probe, d);
  const bakePiece = (d: Piece, i: number) => {
    const c = iso(d.x + (d.w || 0) / 2, d.y + (d.h || 0) / 2),
      made = bakeTight({ x: c.x - 160, y: c.y - 220, w: 320, h: 300 }, res, (ctx) => drawProp(ctx, d), finish(i + 1));
    if (!made) return;
    const s = new Sprite(made.texture);
    s.position.set(made.area.x, made.area.y);
    s.zIndex = depthOf(d);
    items.addChild(s);
    baked.push(made.texture);
  };
  // Solids take a while to paint, so workers paint them, nearest the fire first, and each is baked as its pictures
  // arrive; without workers they are baked a few each frame instead. A resize finds most already painted
  const near = (d: Piece) => Math.hypot(d.x - FIRE.x, d.y - FIRE.y);
  const pending = pieces.map((d, i) => [d, i] as const).sort(([a], [b]) => near(a) - near(b));
  const level = Math.min(4, Math.ceil(res - 0.05)),
    workers = new Map<Worker, (typeof pending)[number] | undefined>();
  let alive = true;
  const next = (w: Worker) => {
    const job = pending.shift();
    workers.set(w, job);
    if (!job) return w.terminate();
    const { kind, x, y, w: dw, h, size, wood } = job[0] as Piece & { size?: number; wood?: boolean };
    w.postMessage({ d: { kind, x, y, w: dw, h, size, wood }, ks: [1, level], i: job[1] });
  };
  for (let n = 0; n < Math.max(1, Math.min(4, navigator.hardwareConcurrency - 1)); n++) {
    try {
      const w = new SolidsWorker();
      w.onmessage = ({ data }: MessageEvent<{ name: string; i: number; pictures: Picture[] }>) => {
        if (!alive) return;
        for (const p of data.pictures) keepPicture(data.name, p.k, p);
        bakePiece(pieces[data.i], data.i);
        next(w);
      };
      // A worker that fails leaves its job to the frames
      w.onerror = () => {
        const job = workers.get(w);
        if (job) pending.unshift(job);
        workers.delete(w);
      };
      workers.set(w, undefined);
      next(w);
    } catch {
      break;
    }
  }

  const light = createLight(renderer, box, [...probe.casters, ...TORCH_CASTERS]);
  const flames = createFlames(items);
  const labels = createLabels(top, res, view.y);
  world.addChild(ground, light.shade, items);
  top.addChild(light.haze);
  root.addChild(world, light.over, top);

  const views = new Map<Person, PersonView>();
  return {
    root,
    shade: light.shade,
    draw(people: Map<string, Person>, now: number) {
      if (!workers.size)
        for (const until = performance.now() + 8; pending.length && performance.now() < until; )
          bakePiece(...pending.shift()!);
      const here = new Set(people.values());
      for (const p of here) {
        if (!views.has(p)) views.set(p, new PersonView(items));
        views.get(p)!.draw(p, now);
      }
      for (const [p, v] of views)
        if (!here.has(p)) {
          v.destroy();
          views.delete(p);
        }
      flames(now);
      light.draw(now, here);
      labels.draw(here, now);
    },
    destroy() {
      alive = false;
      workers.forEach((_, w) => w.terminate());
      views.forEach((v) => v.destroy());
      light.destroy();
      root.destroy({ children: true });
      for (const t of baked) t.destroy(true);
    },
  };
}
