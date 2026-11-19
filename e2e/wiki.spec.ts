import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

const hb = (summary: string) => ({ structured: { summary, body: '', points: [], files: [], checks: [] } });
const start = (role: string, title: string) => ({ call: { name: 'start_task', input: { kind: 'code', title, request: title, role } }, text: '시작했습니다.' });
const SCRIPT = {
  비서: [start('시험', '시험 방법 정리'), { text: '보고 1' }, start('개발', '명령 보완'), { text: '보고 2' }],
  시험: [{ call: { name: 'wiki_write', input: { title: '테스트 방법', body: 'npm test' } }, ...hb('정리') }],
  개발: [{ call: { name: 'wiki_write', input: { title: '테스트 방법', body: 'npm test\nnpm run test:e2e', files: ['package.json'] } }, ...hb('보완') }],
};

test('the wiki keeps one document with two changes by two members, and they survive a restart', async () => {
  const scratch = makeScratch();
  let app = await launchApp(scratch.db, SCRIPT);
  let page = await openProject(app, scratch.project);
  for (const [say, done] of [['테스트 방법 정리해줘', '보고 1'], ['e2e 명령도 넣어줘', '보고 2']]) {
    await page.getByLabel('메시지').fill(say);
    await page.getByLabel('메시지').press('Enter');
    await expect(page.locator('.message .bubble', { hasText: done }).first()).toBeVisible();
  }
  const check = async () => {
    await page.getByRole('tab', { name: '메모리' }).click();
    await expect(page.getByLabel('위키 목차').getByRole('button', { name: '테스트 방법' })).toHaveCount(1);
    const timeline = page.getByLabel('변경 타임라인');
    await expect(timeline.getByRole('button')).toHaveCount(2);
    await expect(timeline.getByRole('button').nth(1)).toContainText('생성');
    await expect(timeline.getByRole('button').nth(1)).toContainText('시험');
    await timeline.getByRole('button').first().click();
    await expect(timeline).toContainText('+ npm run test:e2e');
    await expect(timeline).toContainText('출처: 업무 #2');
    await page.getByLabel('위키 목차').getByRole('button', { name: '테스트 방법' }).click();
    await expect(page.getByLabel('위키 본문')).toContainText('npm run test:e2e');
  };
  await check();
  await app.close();

  app = await launchApp(scratch.db);
  page = await app.firstWindow();
  await page.getByLabel('세션').click();
  await page.getByRole('option', { name: '새 세션' }).click();
  await expect(page.getByLabel('세션')).toHaveText('세션 02');
  await check();
  await app.close();
});
