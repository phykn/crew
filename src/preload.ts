import { contextBridge, ipcRenderer } from 'electron';

// The window gets exactly two doors into the main process: calls, and the feeds it may listen to
contextBridge.exposeInMainWorld('crew', {
  call: (name: string, args?: unknown) => ipcRenderer.invoke('call', name, args),
  on: (channel: 'changed' | 'stream' | 'navigate', fn: (payload: unknown) => void) => {
    const listener = (_e: unknown, payload: unknown) => fn(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
});
