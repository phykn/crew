import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { Store } from './db';
import { Chat } from './chat';
import { Crew } from './crew';
import { loadQuery } from './agent';
import { createHandlers, registerHandlers } from './ipc';

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1100,
    minHeight: 640,
    backgroundColor: '#14131a',
    title: 'AI Crew',
    // The title bar is drawn by the window itself, like the concept image; the OS keeps only its buttons
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#14131a', symbolColor: '#d8d4e6', height: 44 },
    webPreferences: { preload: path.join(__dirname, 'preload.cjs') },
  });
  win.on('closed', () => (win = null));
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
}

app.whenReady().then(() => {
  // Tests point AI_CREW_DB at a scratch file so they never touch the real record
  const dbFile = process.env.AI_CREW_DB || path.join(app.getPath('userData'), 'ai-crew.db');
  const store = new Store(dbFile);
  const crewDir = app.isPackaged ? path.join(process.resourcesPath, 'crew') : path.join(app.getAppPath(), 'crew');
  const crew = new Crew(crewDir);
  const paths = { output: path.join(path.dirname(dbFile), 'output'), protected: [dbFile, `${dbFile}-wal`, `${dbFile}-shm`, crewDir] };
  const chat = new Chat(store, loadQuery, crew, (channel, payload) => win?.webContents.send(channel, payload), paths);
  // A definition added since the last start joins every project it is missing from
  for (const p of store.listProjects()) chat.seed(p.id);
  registerHandlers(createHandlers(store, crew, chat, () => win));
  createWindow();
});

app.on('window-all-closed', () => app.quit());
