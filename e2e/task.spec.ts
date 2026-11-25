import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

const hb = (summary: string, more: Record<string, unknown> = {}) => ({
  structured: { summary, body: '', points: [], files: [], checks: [], ...more },
});
const SCRIPT = {
  통역: [
    {
      call: {
        name: 'start_task',
        input: { original: '원문', title: '검색 개선', request: '빈 검색어는 전체 목록' },
      },
      text: '업무를 시작했습니다.',
    },
    { text: '검색을 고쳤고 코드 검토와 시험을 통과했습니다.' },
  ],
  지휘: [{ structured: { summary: '배정', body: '', kind: 'code' } }, hb('계획')],
  '코드 검토': [hb('계획 통과', { verdict: 'pass' }), hb('코드 통과', { verdict: 'pass' })],
  // 코드 작성 reaches for a tool outside its role, which becomes an answer card
  '코드 작성': [
    {
      tool: { name: 'WebFetch', input: { url: 'https://example.com/docs' } },
      write: { file: 'search.js', text: 'v1' },
      // A summary that mentions failure is still a step that passed
      ...hb('실패하던 빈 검색 수정'),
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
  // Looking at another tab, the chat tab still says a card waits
  await page.getByRole('tab', { name: '로그' }).click();
  await expect(page.getByRole('tab', { name: '대화, 대답 대기' })).toHaveAttribute('data-waiting', 'true');
  await page.getByRole('tab', { name: '대화' }).click();
  // 답하기 on the card brings the question into view, its first option ready
  await card.getByRole('button', { name: '답하기' }).click();
  await expect(page.getByRole('button', { name: '거절' })).toBeFocused();
  await page.getByRole('button', { name: '허용' }).click();
  // The card keeps only the answer, so it reads as done
  await expect(page.getByRole('status').filter({ hasText: '✓ 허용' })).toBeVisible();
  await expect(page.getByText('검색을 고쳤고 코드 검토와 시험을 통과했습니다.')).toBeVisible();
  await expect(card).toHaveCount(0);
  await expect(page.getByRole('tab', { name: '대화, 대답 대기' })).toHaveCount(0);

  await page.getByRole('tab', { name: '로그' }).click();
  const developed = page.locator('.log-row', { hasText: '코드 작성 완료' });
  await expect(developed).not.toHaveAttribute('data-bad', 'true');
  // Each line reads its time, then what became of it, then who did what
  await expect(developed.locator('.log-line > *').first()).toHaveText(/^\d\d:\d\d:\d\d$/);
  await expect(developed.locator('.log-mark')).toHaveAttribute('aria-label', '완료');
  await page.getByRole('button', { name: /코드 작성 완료/ }).click();
  await expect(page.getByLabel('업무 로그')).toContainText('search.js');
  await page.getByRole('button', { name: /시험 완료/ }).click();
  await expect(page.getByLabel('업무 로그')).toContainText('npm test → 3 passed');

  await page.getByRole('tab', { name: '대화' }).click();
  await expect(page.getByText('검색을 고쳤고 코드 검토와 시험을 통과했습니다.')).toBeVisible();
  await app.close();
});
