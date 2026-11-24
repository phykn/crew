import type { ElectronApplication, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export const ASSETS = path.join(__dirname, 'video', 'assets');

// A moment in the recording, in seconds from the first frame; the video is cut on these
export type Marks = Record<string, number> & { stages?: Stage[] };
// A step the task card named while the crew worked: what it said, and when it said it
export type Stage = { text: string; at: number };

// What the video page needs from beside it: the app's own font and animation library
const BESIDE = ['galmuri/dist/Galmuri11.woff2', 'galmuri/dist/Galmuri11-Bold.woff2', 'gsap/dist/gsap.min.js'];

// Records the window through Chrome's screencast: Playwright's own video recording stalls an Electron window,
// and the screencast gives frames only when the picture changes, each as sharp as the window painted it
export async function record(page: Page) {
  const frames = path.join(ASSETS, 'frames');
  fs.rmSync(ASSETS, { recursive: true, force: true });
  fs.mkdirSync(frames, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const shot: { file: string; at: number }[] = [];
  cdp.on('Page.screencastFrame', ({ data, sessionId, metadata }) => {
    const file = `${String(shot.length).padStart(5, '0')}.jpg`;
    fs.writeFileSync(path.join(frames, file), Buffer.from(data, 'base64'));
    shot.push({ file, at: metadata.timestamp! });
    // A frame still on its way when the window closes has nobody left to thank
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  // The highest quality the screencast takes, capped at the window's own size so a retina screen
  // does not quadruple every frame on disk; these frames are the source of every cut below
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 100,
    maxWidth: 1600,
    maxHeight: 900,
    everyNthFrame: 1,
  });
  const marks: Marks = {};
  // The wall clock as the frames stamp it, so marks and frames sit on one timeline
  const now = () => Date.now() / 1000;
  return {
    marks,
    mark(name: string) {
      marks[name] = now();
    },
    async finish(app: ElectronApplication) {
      await cdp.send('Page.stopScreencast');
      await app.close();
      if (!shot.length) throw new Error('the screencast caught no frames');
      const first = shot[0].at;
      // Frames start at the first picture, so the marks move onto that same clock
      for (const [name, at] of Object.entries(marks)) if (typeof at === 'number') marks[name] = at - first;
      for (const stage of marks.stages ?? []) stage.at -= first;
      // Frames come only when the picture changes, so each one is held until the next
      const list = shot.map(
        (f, i) => `file 'frames/${f.file}'\nduration ${((shot[i + 1]?.at ?? f.at + 0.1) - f.at).toFixed(3)}\n`,
      );
      fs.writeFileSync(path.join(ASSETS, 'frames.txt'), list.join('') + `file 'frames/${shot.at(-1)!.file}'\n`);
      for (const f of BESIDE)
        fs.copyFileSync(path.join(__dirname, '..', 'node_modules', f), path.join(ASSETS, path.basename(f)));
      fs.writeFileSync(path.join(ASSETS, 'marks.json'), JSON.stringify(marks, null, 2));
    },
  };
}

// The task card says which step is running; its changes are what the work scenes are cut on.
// Read by polling instead of watching one event, since a stage that lasts a second must still be caught
export async function watchStages(page: Page) {
  await page.evaluate(() => {
    const seen = new Set<string>();
    const stages: { text: string; at: number }[] = [];
    Object.assign(window, { crewStages: stages });
    setInterval(() => {
      const text = document.querySelector('.task-pill')?.textContent?.trim();
      if (text && !seen.has(text)) {
        seen.add(text);
        stages.push({ text, at: Date.now() / 1000 });
      }
    }, 100);
  });
}

export async function readStages(page: Page): Promise<Stage[]> {
  return page.evaluate(() => (window as unknown as { crewStages: Stage[] }).crewStages ?? []);
}
