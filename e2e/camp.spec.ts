import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

// 조사 has no scripted answer, so the task stays on record with 조사 in it
const SCRIPT = {
  통역: [
    {
      call: {
        name: 'start_task',
        input: { original: '원문', title: '자료 조사', request: 'x' },
      },
      text: '시작했습니다.',
    },
    { text: '실패 보고' },
  ],
  지휘: [{ structured: { summary: '배정', body: '', kind: 'research', member: '조사' } }],
};
type Where = { name: string; x: number; y: number } | null;

test('a nickname change shows over the head at once, and clicking a member opens its task log', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, SCRIPT);
  const page = await openProject(app, scratch.project);
  const where = (key: string) =>
    page.evaluate((k) => (window as unknown as { camp: (k: string) => Where }).camp(k), key);
  await expect.poll(async () => (await where('researcher'))?.name).toBe('누리');
  // The camp draws with WebGL, so a canvas left on 2D would mean the old painter came back
  const gl = await page.evaluate(() => {
    const c = document.querySelector('.camp-canvas canvas') as HTMLCanvasElement;
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  });
  expect(gl).toBe(true);
  await page.getByLabel('조사 설정').click();
  await page.getByLabel('조사 별명').fill('나래');
  await page.getByLabel('조사 별명').press('Enter');
  await page.getByRole('dialog').getByRole('button', { name: '닫기' }).click();
  await expect.poll(async () => (await where('researcher'))?.name).toBe('나래');

  await page.getByLabel('메시지').fill('자료 조사해줘');
  await page.getByLabel('메시지').press('Enter');
  await expect(page.getByLabel('업무 자료 조사')).toBeVisible();
  // Out of the legend's way, and standing still once the camp has settled
  await page.getByRole('button', { name: '크루' }).click();
  await expect(async () => {
    const at = (await where('researcher'))!;
    await page.mouse.click(at.x, at.y);
    await expect(page.getByLabel('업무 선택')).toContainText('#1', { timeout: 500 });
  }).toPass({ timeout: 15_000 });
  await expect(page.getByLabel('업무 로그')).toContainText('조사');
  await app.close();
});

type Camp = {
  screen: (x: number, y: number) => { x: number; y: number };
  shadows: (on: boolean) => void;
};

test('the fire throws a log shadow away from it, and leaves the ground on its own side lit', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db);
  const page = await openProject(app, scratch.project);
  await page.getByRole('button', { name: '크루' }).click();
  await expect
    .poll(() => page.evaluate(() => typeof (window as unknown as { camp?: Camp }).camp?.screen))
    .toBe('function');
  // The middle of the log east of the fire, and the fire's, from layout.js; its shadow falls down the screen, clear of the log
  const log = { x: 20.4, y: 15.65 },
    fire = { x: 15, y: 15 },
    d = Math.hypot(log.x - fire.x, log.y - fire.y),
    away = { x: (log.x - fire.x) / d, y: (log.y - fire.y) / d };
  const spots = [1.3, -1.3].map((k) => ({ x: log.x + away.x * k, y: log.y + away.y * k }));
  // The screenshot is read back in the page, which can decode it without a library
  const brightness = async (on: boolean) => {
    await page.evaluate((v) => (window as unknown as { camp: Camp }).camp.shadows(v), on);
    await page.waitForTimeout(100);
    const points = await page.evaluate(
      (s) => s.map((p) => (window as unknown as { camp: Camp }).camp.screen(p.x, p.y)),
      spots,
    );
    const png = (await page.screenshot()).toString('base64');
    return page.evaluate(
      async ({ png, points }) => {
        const img = new Image();
        img.src = 'data:image/png;base64,' + png;
        await img.decode();
        const c = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height }),
          d = c.getContext('2d')!,
          k = img.width / innerWidth;
        d.drawImage(img, 0, 0);
        return points.map((p) => {
          const v = d.getImageData(Math.round(p.x * k) - 2, Math.round(p.y * k) - 2, 5, 5).data;
          let sum = 0;
          for (let i = 0; i < v.length; i += 4) sum += v[i] + v[i + 1] + v[i + 2];
          return sum / (v.length / 4);
        });
      },
      { png, points },
    );
  };
  await expect(async () => {
    const [behind, before] = await brightness(false),
      [behindShaded, beforeShaded] = await brightness(true);
    expect(behindShaded).toBeLessThan(behind * 0.8);
    expect(beforeShaded).toBeGreaterThan(before * 0.95);
  }).toPass({ timeout: 15_000 });
  await app.close();
});
