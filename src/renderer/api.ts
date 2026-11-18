import type { Handlers } from '../main/ipc';

declare global {
  interface Window {
    crew: {
      call: (name: string, args?: unknown) => Promise<unknown>;
      onChange: (fn: (topic: string) => void) => () => void;
    };
  }
}

type Run<K extends keyof Handlers> = Handlers[K]['run'];

// Typed from the main process's own handlers, so a renamed call fails to compile here
export function call<K extends keyof Handlers>(
  name: K,
  ...args: Parameters<Run<K>>
): Promise<Awaited<ReturnType<Run<K>>>> {
  return window.crew.call(name, args[0]) as Promise<Awaited<ReturnType<Run<K>>>>;
}
