import { CanvasSource, Texture } from 'pixi.js';

export type Rect = { x: number; y: number; w: number; h: number };
type Paint = (ctx: CanvasRenderingContext2D) => void;
// A pass over the finished canvas, in its own device pixels
type Finish = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function canvasOf(w: number, h: number) {
  return Object.assign(document.createElement('canvas'), {
    width: Math.max(1, Math.ceil(w)),
    height: Math.max(1, Math.ceil(h)),
  });
}

export function textureOf(canvas: HTMLCanvasElement | OffscreenCanvas, resolution = 1, nearest = false) {
  // Made at resolution 1 and only then given its own: Pixi works out canvas size / resolution * resolution, and when that
  // rounds a pixel short it resizes the canvas, which wipes it, so a piece vanished and left only its shadow
  const source = new CanvasSource({ resource: canvas, resolution: 1, scaleMode: nearest ? 'nearest' : 'linear' });
  source.resolution = resolution;
  return new Texture({ source });
}

// What 2D calls paint over an area of the world, as a texture of res device pixels per world pixel
export function bake(area: Rect, res: number, paint: Paint, finish?: Finish) {
  const c = canvasOf(area.w * res, area.h * res),
    ctx = c.getContext('2d')!;
  ctx.setTransform(res, 0, 0, res, -area.x * res, -area.y * res);
  paint(ctx);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  finish?.(ctx, c.width, c.height);
  return textureOf(c, res);
}

// A piece's painting is first tried on a roomy canvas, so only the part it really covers becomes its texture
export function bakeTight(room: Rect, res: number, paint: Paint, finish?: Finish) {
  const probe = canvasOf(room.w, room.h),
    p = probe.getContext('2d', { willReadFrequently: true })!;
  p.translate(-room.x, -room.y);
  paint(p);
  const { data } = p.getImageData(0, 0, probe.width, probe.height);
  let [l, t, r, b] = [probe.width, probe.height, -1, -1];
  for (let y = 0; y < probe.height; y++)
    for (let x = 0; x < probe.width; x++)
      if (data[(y * probe.width + x) * 4 + 3]) {
        if (x < l) l = x;
        if (x > r) r = x;
        if (y < t) t = y;
        if (y > b) b = y;
      }
  if (r < 0) return null;
  // A pixel of margin keeps the soft edges that the probe's coarser pixels rounded away
  const area = { x: room.x + l - 1, y: room.y + t - 1, w: r - l + 3, h: b - t + 3 };
  return { area, texture: bake(area, res, paint, finish) };
}
