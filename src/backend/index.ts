import { app, BrowserWindow, Notification, powerSaveBlocker, protocol } from 'electron';
import path from 'node:path';
import { Store } from './db';
import { Chat } from './chat';
import { Crew } from './crew/shipped';
import { loadSdk } from './agents/run';
import { scriptSdk } from './agents/script';
import { createHandlers, registerHandlers } from './window/ipc';
import { IMAGE_SCHEME } from '../shared';

let win: BrowserWindow | null = null;

// Registered before the app is ready, as Electron requires, so sent pictures load like files and are cached
protocol.registerSchemesAsPrivileged([{ scheme: IMAGE_SCHEME, privileges: { standard: true, secure: true } }]);

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
    // --surface-frame and --text-heading from tokens.css; the main process cannot read CSS
    titleBarOverlay: { color: '#fbe7bd', symbolColor: '#5c3213', height: 46 },
    webPreferences: { preload: path.join(__dirname, 'preload.cjs') },
  });
  win.on('closed', () => (win = null));
  // A file dropped anywhere but the chat input would otherwise replace the app with that file
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  // The parts gallery opens only when started for it; the window has no way to get there itself
  const hash = process.env.CREW_GALLERY === '1' ? 'gallery' : '';
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) win.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}${hash && `#${hash}`}`);
  else win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`), { hash });
}

// A report or a card that comes while the user is in another window would otherwise wait unseen
function notify({ text }: { text: string }) {
  if (!win || win.isFocused() || !Notification.isSupported()) return;
  const note = new Notification({ title: '비서', body: text.length > 200 ? `${text.slice(0, 200)}…` : text });
  note.on('click', () => {
    win?.show();
    win?.focus();
  });
  note.show();
}

// A sleeping computer would cut off the crew mid-step; the screen may still turn off
let awake: number | null = null;
function keepAwake(busy: boolean) {
  if (busy && awake === null) awake = powerSaveBlocker.start('prevent-app-suspension');
  if (!busy && awake !== null) {
    powerSaveBlocker.stop(awake);
    awake = null;
  }
}

app.whenReady().then(() => {
  // Windows shows an app's notifications only under an app id; the app is run from its folder, not installed
  if (process.platform === 'win32') app.setAppUserModelId(process.execPath);
  // Tests point CREW_DB at a scratch file so they never touch the real record
  const dbFile = process.env.CREW_DB || path.join(app.getPath('userData'), 'crew.db');
  const store = new Store(dbFile);
  // A sent picture never changes, so the window may keep it as long as it likes
  protocol.handle(IMAGE_SCHEME, (req) => {
    const [, messageId, n] = new URL(req.url).pathname.split('/').map(Number);
    const image = store.readImage(messageId, n);
    if (!image) return new Response(null, { status: 404 });
    return new Response(Buffer.from(image.data, 'base64'), {
      headers: { 'content-type': image.mediaType, 'cache-control': 'max-age=31536000, immutable' },
    });
  });
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
    (channel, payload) => {
      if (channel === 'notify') notify(payload as { text: string });
      else if (channel === 'busy') keepAwake(payload as boolean);
      else win?.webContents.send(channel, payload);
    },
    paths,
  );
  // A definition added since the last start joins every project it is missing from
  for (const p of store.listProjects()) chat.members.seed(p.id);
  store.recoverInterrupted();
  registerHandlers(createHandlers(store, crew, chat, () => win));
  createWindow();
});

app.on('window-all-closed', () => app.quit());
