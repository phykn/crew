import { BrowserWindow, dialog, ipcMain } from 'electron';
import { z } from 'zod';
import type { Store } from './db';

const id = z.number().int().positive();

// Every call the window can make, with the schema its arguments must pass
export function createHandlers(store: Store, win: () => BrowserWindow | null) {
  return {
    'projects.list': { args: z.undefined(), run: () => store.listProjects() },
    'projects.open': {
      args: z.undefined(),
      run: async () => {
        const w = win();
        const picked = w
          ? await dialog.showOpenDialog(w, { properties: ['openDirectory'] })
          : await dialog.showOpenDialog({ properties: ['openDirectory'] });
        return picked.canceled || !picked.filePaths[0] ? null : store.addProject(picked.filePaths[0]);
      },
    },
    'sessions.list': { args: z.object({ projectId: id }), run: (a: { projectId: number }) => store.listSessions(a.projectId) },
    'sessions.create': {
      args: z.object({ projectId: id }),
      run: (a: { projectId: number }) => store.createSession(a.projectId),
    },
    'last.read': {
      args: z.undefined(),
      run: () => JSON.parse(store.readSetting('last') ?? '{}') as { projectId?: number; sessionId?: number },
    },
    'last.write': {
      args: z.object({ projectId: id.optional(), sessionId: id.optional() }),
      run: (a: { projectId?: number; sessionId?: number }) => store.writeSetting('last', JSON.stringify(a)),
    },
  };
}

export type Handlers = ReturnType<typeof createHandlers>;

export function registerHandlers(handlers: Handlers) {
  ipcMain.handle('call', async (_event, name: string, args: unknown) => {
    const handler = handlers[name as keyof Handlers];
    if (!handler) throw new Error(`unknown call ${name}`);
    // The window is untrusted input: nothing reaches a handler without passing its schema
    return (handler.run as (a: unknown) => unknown)(handler.args.parse(args));
  });
}
