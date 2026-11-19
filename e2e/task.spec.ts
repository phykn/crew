import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

const hb = (summary: string, more: Record<string, unknown> = {}) => ({
  structured: { summary, body: '', points: [], files: [], checks: [], ...more },
});
const SCRIPT = {
  비서: [
    {
      call: { name: 'start_task', input: { kind: 'code', title: '검색 개선', request: '빈 검색어는 전체 목록' } },
      text: '업무를 시작했습니다.',
    },
    { text: '검색을 고쳤고 리뷰와 시험을 통과했습니다.' },
  ],
  기획: [hb('계획')],
  리뷰: [hb('계획 통과', { verdict: 'pass' }), hb('코드 통과', { verdict: 'pass' })],
  // 개발 reaches for a tool outside its role, which becomes an answer card
  개발: [
    {
      tool: { name: 'WebFetch', input: { url: 'https://example.com/docs' } },
      write: { file: 'search.js', text: 'v1' },
      ...hb('검색 수정'),
    },
  ],
  시험: [hb('시험 통과', { verdict: 'pass', checks: ['npm test → 3 passed'] })],
  표준: [hb('스타일 통과', { verdict: 'pass' })],
};

test('a message opens a pinned task card, the answer card lets it go on, and the log opens the handback', async () => {
  const scratch = makeScratch({ 'search.js': 'v0' });
  const app = await launchApp(scratch.db, SCRIPT);
  const page = await openProject(app, scratch.project);
  await page.getByLabel('메시지').fill('빈 검색어는 전체 목록을 보여주게 바꿔줘');
  await page.getByLabel('메시지').press('Enter');

  const card = page.getByLabel('업무 검색 개선');
  await expect(card).toContainText('내 답변 대기');
  await page.getByRole('button', { name: '허용' }).click();
  // The card keeps only the answer, so it reads as done
  await expect(page.getByRole('status').filter({ hasText: '✓ 허용' })).toBeVisible();
  await expect(page.getByText('검색을 고쳤고 리뷰와 시험을 통과했습니다.')).toBeVisible();
  await expect(card).toHaveCount(0);

  await page.getByRole('tab', { name: '로그' }).click();
  await page.getByRole('button', { name: /개발 완료/ }).click();
  await expect(page.getByLabel('업무 로그')).toContainText('search.js');
  await page.getByRole('button', { name: /시험 완료/ }).click();
  await expect(page.getByLabel('업무 로그')).toContainText('npm test → 3 passed');

  await page.getByRole('tab', { name: '대화' }).click();
  await expect(page.getByText('검색을 고쳤고 리뷰와 시험을 통과했습니다.')).toBeVisible();
  await app.close();
});
