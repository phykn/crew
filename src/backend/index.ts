import { app } from 'electron';
import path from 'node:path';
import { Store } from './adapters/sqlite/store';
import { wire } from './wire';
import { loadCrew } from './adapters/files/crew';
import { loadSdk } from './adapters/claude/agent';
import { scriptSdk } from './adapters/claude/script';
import { createHandlers, registerHandlers } from './adapters/electron/ipc';
import { SafeSecrets } from './adapters/electron/secrets';
import { createWindow, registerImageScheme, serveImages, toWindow, win } from './adapters/electron/window';

// Puts the app together: the record, the crew, the SDK, and the window, handed to the adapters and use cases
registerImageScheme();

app.whenReady().then(() => {
  // Windows shows an app's notifications only under an app id; the app is run from its folder, not installed
  if (process.platform === 'win32') app.setAppUserModelId(process.execPath);
  // Tests point CREW_DB at a scratch file so they never touch the real record
  const dbFile = process.env.CREW_DB || path.join(app.getPath('userData'), 'crew.db');
  const store = new Store(dbFile);
  serveImages(store);
  const crewDir = app.isPackaged ? path.join(process.resourcesPath, 'crew') : path.join(app.getAppPath(), 'crew');
  const crew = loadCrew(crewDir);
  const paths = {
    output: path.join(path.dirname(dbFile), 'output'),
    protected: [dbFile, `${dbFile}-wal`, `${dbFile}-shm`, crewDir],
  };
  // Window tests run the crew from a script instead of Claude
  const script = process.env.CREW_SCRIPT;
  const scripted = script ? scriptSdk(script) : null;
  const sdk = scripted ? async () => scripted : loadSdk;
  const chat = wire({
    records: store,
    secrets: new SafeSecrets(store),
    sdk,
    crew,
    emit: toWindow,
    paths,
  });
  // A definition added since the last start joins every project it is missing from
  for (const p of store.listProjects()) chat.members.seed(p.id);
  store.recoverInterrupted();
  registerHandlers(createHandlers(chat, () => win));
  createWindow();
});

app.on('window-all-closed', () => app.quit());
