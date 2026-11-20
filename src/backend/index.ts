import { app, BrowserWindow, Notification } from 'electron';
import path from 'node:path';
import { Store } from './db';
import { Chat } from './chat';
import { Crew } from './crew/shipped';
import { loadSdk } from './agents/run';
import { scriptSdk } from './agents/script';
import { createHandlers, registerHandlers } from './window/ipc';

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 900,
    // Narrow enough for the stacked layout, where the chat goes under the camp
    minWidth: 420,
    minHeight: 640,
    backgroundColor: '#14131a',
    title: 'crew',
    // The title bar is drawn by the window itself, like the concept image; the OS keeps only its buttons
    titleBarStyle: 'hidden',
    // --panel and --wood-dark from tokens.css; the main process cannot read CSS
    titleBarOverlay: { color: '#fbe7bd', symbolColor: '#5c3213', height: 46 },
    webPreferences: { preload: path.join(__dirname, 'preload.cjs') },
  });
  win.on('closed', () => (win = null));
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  else win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
}

// A report or a card that comes while the user is in another window would otherwise wait unseen
function notify({ text }: { text: string }) {
  if (!win || win.isFocused() || !Notification.isSupported()) return;
  const note = new Notification({ title: 'crew · 비서', body: text.length > 200 ? `${text.slice(0, 200)}…` : text });
  note.on('click', () => {
    win?.show();
    win?.focus();
  });
  note.show();
}

app.whenReady().then(() => {
  // Windows shows an app's notifications only under an app id; the app is run from its folder, not installed
  if (process.platform === 'win32') app.setAppUserModelId(process.execPath);
  // Tests point CREW_DB at a scratch file so they never touch the real record
  const dbFile = process.env.CREW_DB || path.join(app.getPath('userData'), 'crew.db');
  const store = new Store(dbFile);
  const crewDir = app.isPackaged ? path.join(process.resourcesPath, 'crew') : path.join(app.getAppPath(), 'crew');
  const crew = new Crew(crewDir);
  const paths = {
    output: path.join(path.dirname(dbFile), 'output'),
    protected: [dbFile, `${dbFile}-wal`, `${dbFile}-shm`, crewDir],
  };
  // Window tests run the crew from a script instead of Claude
  const script = process.env.CREW_SCRIPT;
  const scripted = script ? scriptSdk(script) : null;
  const sdk = scripted ? async () => scripted : loadSdk;
  const chat = new Chat(
    store,
    sdk,
    crew,
    (channel, payload) =>
      channel === 'notify' ? notify(payload as { text: string }) : win?.webContents.send(channel, payload),
    paths,
  );
  // A definition added since the last start joins every project it is missing from
  for (const p of store.listProjects()) chat.members.seed(p.id);
  store.recoverInterrupted();
  registerHandlers(createHandlers(store, crew, chat, () => win));
  createWindow();
});

app.on('window-all-closed', () => app.quit());
