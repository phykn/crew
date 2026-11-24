import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

const hb = (summary: string) => ({ structured: { summary, body: '', points: [], files: [], checks: [] } });
// The second task is code, so its change also goes through every check
const pass = { structured: { summary: '통과', body: '', verdict: 'pass', points: [], files: [], checks: ['ok'] } };
const start = (role: string, title: string) => ({
  call: { name: 'start_task', input: { original: '원문', kind: 'code', title, request: title, role } },
  text: '시작했습니다.',
});
// The members only hand back; the librarian folds each finished task into the wiki on its own
const SCRIPT = {
  통역: [start('시험', '시험 방법 정리'), { text: '보고 1' }, start('코드 작성', '명령 보완'), { text: '보고 2' }],
  시험: [hb('정리'), pass],
  '코드 검토': [pass],
  '코드 작성': [hb('보완')],
  기록: [
    { call: { name: 'wiki_write', input: { title: '테스트 방법', body: 'npm test' } }, text: '정리' },
    { call: { name: 'wiki_write', input: { title: '테스트 방법', body: 'npm test\nnpm run test:e2e' } }, text: '보완' },
  ],
};

test('the librarian keeps one document with a change after each task, and the window only reads it', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, SCRIPT);
  const page = await openProject(app, scratch.project);
  for (const [say, done] of [
    ['테스트 방법 정리해줘', '보고 1'],
    ['e2e 명령도 넣어줘', '보고 2'],
  ]) {
    await page.getByLabel('메시지').fill(say);
    await page.getByLabel('메시지').press('Enter');
    await expect(page.locator('.message .bubble', { hasText: done }).first()).toBeVisible();
  }
  const check = async () => {
    await page.getByRole('tab', { name: '메모리' }).click();
    await expect(page.getByLabel('위키 목차').getByRole('button', { name: '테스트 방법' })).toHaveCount(1);
    const timeline = page.getByLabel('변경 타임라인').getByRole('listitem');
    await expect(timeline).toHaveCount(2);
    await expect(timeline.nth(0)).toContainText('수정');
    await expect(timeline.nth(1)).toContainText('생성');
    await expect(timeline.nth(1)).toContainText('기록');
    await expect(page.getByRole('button', { name: '+ 새 문서' })).toHaveCount(0);
    await page.getByLabel('위키 목차').getByRole('button', { name: '테스트 방법' }).click();
    await expect(page.getByLabel('위키 본문')).toContainText('npm run test:e2e');
    // The graph shows the document as a dot that opens it
    await page.getByRole('button', { name: '그래프' }).click();
    await page.getByLabel('위키 그래프').getByLabel('문서 테스트 방법').click();
    await expect(page.getByLabel('위키 본문')).toContainText('npm run test:e2e');
  };
  await check();
  await app.close();
});
