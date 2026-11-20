import type { z } from 'zod';
import type { Handlers } from '../backend/window/ipc';

declare global {
  interface Window {
    crew: {
      call: (name: string, args?: unknown) => Promise<unknown>;
      on: (channel: 'changed' | 'stream' | 'navigate', fn: (payload: unknown) => void) => () => void;
    };
  }
}

// What a call takes, as its schema reads it before parsing
export type Args<K extends keyof Handlers> = z.input<Handlers[K]['args']>;
type Result<K extends keyof Handlers> = Awaited<ReturnType<Handlers[K]['run']>>;

// Typed from the main process's own handlers, so a renamed call fails to compile here
export function call<K extends keyof Handlers>(
  name: K,
  ...args: Args<K> extends undefined ? [] : [Args<K>]
): Promise<Result<K>> {
  return window.crew.call(name, args[0]) as Promise<Result<K>>;
}

type StreamEvent = { sessionId: number; delta?: string; done?: boolean };

// A change to messages or tasks names its session; a listener given its own session skips the others'
export function onChanged(fn: (topic: string) => void, sessionId?: number) {
  return window.crew.on('changed', (p) => {
    const c = p as { topic: string; sessionId?: number };
    if (sessionId === undefined || c.sessionId === undefined || c.sessionId === sessionId) fn(c.topic);
  });
}

// 비서 opening a screen, the way a click would
type Navigate = { sessionId: number; view: 'log' | 'wiki' | 'workflow'; taskId?: number; kind?: string };

export function onNavigate(fn: (ev: Navigate) => void) {
  return window.crew.on('navigate', (p) => fn(p as Navigate));
}

export function onStream(fn: (ev: StreamEvent) => void) {
  return window.crew.on('stream', (p) => fn(p as StreamEvent));
}
