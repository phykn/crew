import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

const OUT = 'C:/Users/SDI_USER/AppData/Local/Temp/claude/48f8ea9c89c2589b/3539517b-0d73-4ef1-ae51-ecb021e19eed/scratchpad/review-fx/';
const SCRIPT = {
  통역: [
    { call: { name: 'start_task', input: { original: '원문', title: '자료 조사', request: 'x' } }, text: '시작했습니다.' },
    { text: '실패 보고' },
  ],
  지휘: [{ structured: { summary: '배정', body: '', kind: 'research', member: '조사' } }],
};
type Camp = { screen: (x: number, y: number, z?: number) => { x: number; y: number } } & ((k: string) => { x: number; y: number } | null);

test('review fx', async () => {
  test.setTimeout(120_000);
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, SCRIPT);
  const page = await openProject(app, scratch.project);
  await page.getByLabel('메시지').fill('자료 조사해줘');
  await page.getByLabel('메시지').press('Enter');
  await expect(page.getByLabel('업무 자료 조사')).toBeVisible();
  await page.getByRole('button', { name: '크루' }).click();
  await expect.poll(() => page.evaluate(() => typeof (window as any).camp?.screen)).toBe('function');
  await page.waitForTimeout(6000);
  const info = await page.evaluate(() => {
    const c = (window as any).camp as Camp;
    const torches = [...Array(6)].map((_, i) => {
      const a = ((30 + i * 60) * Math.PI) / 180;
      return c.screen(15 + 7.6 * Math.cos(a), 15 + 7.6 * Math.sin(a));
    });
    return { fire: c.screen(15, 15), torches, res: c('researcher'), dpr: devicePixelRatio, w: innerWidth, h: innerHeight };
  });
  require('fs').writeFileSync(OUT + 'info.json', JSON.stringify(info));
  for (let i = 0; i < 6; i++) {
    await page.screenshot({ path: OUT + `full-${i}.png` });
    await page.waitForTimeout(150);
  }
  await app.close();
});
