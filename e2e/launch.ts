import { _electron as electron, type ElectronApplication } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// A scratch record and a scratch project folder per test, so the real app data is never touched
export function makeScratch(files: Record<string, string> = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-crew-e2e-'));
  const project = path.join(dir, 'demo');
  fs.mkdirSync(project);
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(project, name), text);
  return { db: path.join(dir, 'crew.db'), project };
}

// A script makes the crew answer from it instead of Claude
export async function launchApp(db: string, script?: unknown): Promise<ElectronApplication> {
  const env = { ...process.env, AI_CREW_DB: db } as Record<string, string>;
  if (script) {
    env.AI_CREW_SCRIPT = path.join(path.dirname(db), 'script.json');
    fs.writeFileSync(env.AI_CREW_SCRIPT, JSON.stringify(script));
  }
  // Set by editors that host Node in Electron; it would start Electron as plain Node
  delete env.ELECTRON_RUN_AS_NODE;
  return electron.launch({ args: ['.'], env });
}

// The native folder dialog cannot be clicked, so the test answers it from the main process
export async function answerFolderDialog(app: ElectronApplication, folder: string) {
  await app.evaluate(({ dialog }, picked) => {
    dialog.showOpenDialog = (async () => ({ canceled: false, filePaths: [picked] })) as typeof dialog.showOpenDialog;
  }, folder);
}

export async function openProject(app: ElectronApplication, folder: string) {
  const page = await app.firstWindow();
  await answerFolderDialog(app, folder);
  await page.getByLabel('프로젝트').click();
  await page.getByRole('option', { name: '폴더 열기…' }).click();
  return page;
}
