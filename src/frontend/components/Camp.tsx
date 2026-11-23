import { useEffect, useRef, useState, type RefObject } from 'react';
import { Application, useApplication, useTick } from '@pixi/react';
// The window's security policy forbids eval, which Pixi builds its shaders with unless given this
import 'pixi.js/unsafe-eval';
import type { CrewMember } from '../../backend/domain/crew';
import type { Session } from '../../backend/domain/records';
import { call, follow } from '../api';
import { CAMP, iso } from '../camp/projection.js';
import { createWalkers } from '../camp/walkers.js';
import { createScene } from '../camp/stage/scene';
import type { Box } from '../camp/stage/light';

const NONE: Record<string, string> = {};

type Walkers = ReturnType<typeof createWalkers>;

// The camp, drawn with WebGL behind the legend; it follows the crew list it is given
export function Camp({
  members,
  session,
  onPick,
}: {
  members: CrewMember[];
  session: Session | null;
  onPick: (taskId: number) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const walkers = useRef<Walkers | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [state, setState] = useState<Awaited<ReturnType<typeof call<'camp.state'>>> | null>(null);
  const working = state?.working ?? NONE;
  // The first state read for a session is only a baseline, so switching sessions replays none of its history
  const fresh = useRef(true);

  // The camp follows the session's record: work under way, and new lines to play as scenes
  useEffect(() => {
    fresh.current = true;
    if (!session) return setState(null);
    return follow(
      () => call('camp.state', { sessionId: session.id }),
      setState,
      (t) => ['tasks', 'messages', 'members'].includes(t),
      session.id,
    );
  }, [session?.id]);
  useEffect(() => {
    if (!state) return;
    walkers.current!.applyLog(state.log, fresh.current);
    fresh.current = false;
  }, [state]);
  walkers.current ??= createWalkers();

  // People are kept by key, so a renamed member keeps walking where they were and only the name tag changes
  useEffect(() => {
    walkers.current!.applyStaff(
      members
        .filter((m) => m.status === 'hired')
        .map((m) => ({
          team: m.key,
          name: m.nickname,
          color: m.color,
          look: m.look,
          state: working[m.key] ? 'working' : 'idle',
        })),
    );
    walkers.current!.applyNow(working);
  }, [members, working]);

  useEffect(() => {
    const measure = () => {
      const w = wrap.current!.clientWidth,
        h = wrap.current!.clientHeight;
      const scale = Math.max(0.4, Math.min(w / CAMP.w, h / CAMP.h));
      setBox({
        w,
        h,
        scale,
        ox: (w - CAMP.w * scale) / 2 - CAMP.x * scale,
        oy: (h - CAMP.h * scale) / 2 - CAMP.y * scale,
        dpr: devicePixelRatio,
      });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(wrap.current!);
    // A window moved to a screen of another scale keeps its size, so only the pixel ratio says to paint again
    let ratio: MediaQueryList;
    const watch = () => {
      ratio = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
      ratio.addEventListener('change', rescale, { once: true });
    };
    const rescale = () => {
      measure();
      watch();
    };
    watch();
    return () => {
      ro.disconnect();
      ratio.removeEventListener('change', rescale);
    };
  }, []);

  return (
    <div
      className="camp-canvas"
      ref={wrap}
      onClick={(e) => {
        if (!box || !state) return;
        const r = e.currentTarget.getBoundingClientRect();
        const key = walkers.current!.at(
          (e.clientX - r.left - box.ox) / box.scale,
          (e.clientY - r.top - box.oy) / box.scale,
        );
        if (key && state.tasks[key]) onPick(state.tasks[key]);
      }}
    >
      {box?.w ? (
        <Application
          key={box.dpr}
          resizeTo={wrap}
          resolution={box.dpr}
          autoDensity
          preference="webgl"
          background={0x0c0a08}
        >
          <Stage box={box} walkers={walkers.current!} wrap={wrap} />
        </Application>
      ) : null}
    </div>
  );
}

// Lives inside the Pixi application: builds the scene for each size and moves it every frame
function Stage({ box, walkers, wrap }: { box: Box; walkers: Walkers; wrap: RefObject<HTMLDivElement | null> }) {
  const { app, isInitialised } = useApplication();
  const scene = useRef<ReturnType<typeof createScene> | null>(null);
  useEffect(() => {
    if (!isInitialised) return;
    // The panel can change size without the window doing so, which is all Pixi listens to
    app.renderer.resize(box.w, box.h);
    walkers.fitView({ x: -box.ox / box.scale, y: -box.oy / box.scale, w: box.w / box.scale, h: box.h / box.scale });
    const s = createScene(app.renderer, box);
    app.stage.addChild(s.root);
    scene.current = s;
    // The canvas has no DOM to query, so window tests read who stands where, and with what name, from here
    const screen = (x: number, y: number, z = 0) => {
      const f = iso(x, y, z),
        r = wrap.current!.getBoundingClientRect();
      return { x: r.left + f.x * box.scale + box.ox, y: r.top + f.y * box.scale + box.oy };
    };
    (window as unknown as { camp: unknown }).camp = Object.assign(
      (key: string) => {
        const p = walkers.people.get(key);
        return p ? { name: p.room.name, ...screen(p.x, p.y, 20) } : null;
      },
      // Where a spot on the ground shows, and the shadows switched off and on, so a test can see what they darken
      { screen, shadows: (on: boolean) => (s.shade.visible = on) },
    );
    return () => {
      scene.current = null;
      s.destroy();
    };
  }, [isInitialised, box]);
  useTick((ticker) => {
    const now = performance.now();
    walkers.tick(now, Math.min(0.1, ticker.deltaMS / 1000));
    scene.current?.draw(walkers.people, now);
  });
  return null;
}
