import { _electron as electron, type ElectronApplication } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NAMES } from '../src/frontend/locale';

const KEY_OF = Object.fromEntries(Object.entries(NAMES.roles).map(([key, role]) => [role, key]));

// A scratch record and a scratch project folder per test, so the real app data is never touched
export function makeScratch(files: Record<string, string> = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crew-e2e-'));
  const project = path.join(dir, 'demo');
  fs.mkdirSync(project);
  for (const [name, text] of Object.entries(files)) {
    const file = path.join(project, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
  return { db: path.join(dir, 'crew.db'), project };
}

// A script makes the crew answer from it instead of Claude
export async function launchApp(
  db: string,
  script?: unknown,
  more: Record<string, string> = {},
): Promise<ElectronApplication> {
  const env = { ...process.env, CREW_DB: db, ...more } as Record<string, string>;
  if (script) {
    env.CREW_SCRIPT = path.join(path.dirname(db), 'script.json');
    // Scripts name members as the screen does; the app reads them by key
    const byKey = Object.fromEntries(
      Object.entries(script as Record<string, unknown>).map(([role, turns]) => [KEY_OF[role] ?? role, turns]),
    );
    fs.writeFileSync(env.CREW_SCRIPT, JSON.stringify(byKey));
  }
  // Set by editors that host Node in Electron; it would start Electron as plain Node
  delete env.ELECTRON_RUN_AS_NODE;
  const app = await electron.launch({ args: ['.', ...OFFSCREEN], env });
  await app.firstWindow();
  // Off the screen, so the tests neither cover the user's work nor catch their clicks
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows().forEach((w) => w.setPosition(-32000, -32000)),
  );
  // An unfocused test window would pop real notifications; they are kept for the tests to read instead
  await app.evaluate(({ Notification }) => {
    const shown: string[] = [];
    Object.assign(globalThis, { shown });
    Notification.prototype.show = function (this: Electron.Notification) {
      shown.push(this.body);
    };
  });
  return app;
}

// Chromium stops painting a window it thinks nobody can see, which would stall screenshots and animation
const OFFSCREEN = [
  '--disable-features=CalculateNativeWinOcclusion',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
];

// The native folder dialog cannot be clicked, so the test answers it from the main process
export async function answerFolderDialog(app: ElectronApplication, folder: string) {
  await app.evaluate(({ dialog }, picked) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [picked] })) as typeof dialog.showOpenDialog;
  }, folder);
}

export async function openProject(
  app: ElectronApplication,
  folder: string,
  words: { project: string; openMore: string } = { project: '프로젝트', openMore: '폴더 열기…' },
) {
  const page = await app.firstWindow();
  await answerFolderDialog(app, folder);
  await page.getByLabel(words.project).click();
  await page.getByRole('option', { name: words.openMore }).click();
  return page;
}
