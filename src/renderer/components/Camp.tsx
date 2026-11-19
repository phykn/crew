import { useEffect, useRef, useState } from 'react';
import type { CrewMember } from '../../main/crew';
import { CAMP } from '../camp/projection.js';
import { createWalkers } from '../camp/walkers.js';
import { paintGround } from '../camp/paint/ground.js';
import { DARK_SCALE } from '../camp/paint/lighting.js';
import { createPainter } from '../camp/paint/frame.js';

// Motion is always on: reducing it was left out of the app
const still = false;
// 30 frames a second is plenty for walking and torch flicker, and halves the drawing work
const FRAME_MS = 33;

type Box = { w: number; h: number; scale: number; ox: number; oy: number };

// The camp from the earlier app, drawn on one canvas behind the legend; it follows the crew list it is given
export function Camp({ members, working }: { members: CrewMember[]; working: Record<string, string> }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const walkers = useRef<ReturnType<typeof createWalkers> | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  walkers.current ??= createWalkers(still);

  // People are kept by key, so a renamed member keeps walking where they were and only the name tag changes
  useEffect(() => {
    walkers.current!.applyStaff(
      members
        .filter((m) => m.status === 'hired')
        .map((m) => ({ team: m.key, name: m.nickname, color: m.color, look: m.look, state: working[m.key] ? 'working' : 'idle' })),
    );
    walkers.current!.applyNow(working);
  }, [members, working]);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const w = wrap.current!.clientWidth, h = wrap.current!.clientHeight;
      const scale = Math.max(0.4, Math.min(w / CAMP.w, h / CAMP.h));
      setBox({ w, h, scale, ox: (w - CAMP.w * scale) / 2 - CAMP.x * scale, oy: (h - CAMP.h * scale) / 2 - CAMP.y * scale });
    });
    ro.observe(wrap.current!);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!box?.w) return;
    const dpr = devicePixelRatio, c = canvas.current!, { scale, ox, oy } = box;
    const layer = (k: number) => Object.assign(document.createElement('canvas'), { width: Math.ceil(box.w * dpr * k), height: Math.ceil(box.h * dpr * k) });
    Object.assign(c, { width: Math.round(box.w * dpr), height: Math.round(box.h * dpr) });
    const view = { x: -ox / scale, y: -oy / scale, w: box.w / scale, h: box.h / scale };
    walkers.current!.fitView(view);
    const ground = layer(1), dark = layer(DARK_SCALE);
    const gctx = ground.getContext('2d')!;
    gctx.setTransform(scale * dpr, 0, 0, scale * dpr, ox * dpr, oy * dpr);
    paintGround(gctx, view);
    const ctx = c.getContext('2d')!, drawFrame = createPainter(ground, dark, view);
    let last = performance.now(), raf = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (t - last < FRAME_MS) return;
      walkers.current!.tick(t, Math.min(0.1, (t - last) / 1000));
      last = t;
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, ox * dpr, oy * dpr);
      drawFrame(ctx, walkers.current!.people, t, still, false);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [box]);

  return (
    <div className="camp-canvas" ref={wrap}>
      <canvas ref={canvas} />
    </div>
  );
}
