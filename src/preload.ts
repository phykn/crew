import { contextBridge, ipcRenderer } from 'electron';

// The window gets exactly two doors into the main process: a call and a change feed
contextBridge.exposeInMainWorld('crew', {
  call: (name: string, args?: unknown) => ipcRenderer.invoke('call', name, args),
  onChange: (fn: (topic: string) => void) => {
    const listener = (_e: unknown, topic: string) => fn(topic);
    ipcRenderer.on('changed', listener);
    return () => ipcRenderer.removeListener('changed', listener);
  },
});
