import { execFileSync } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

const hb = (summary: string, more: Record<string, unknown> = {}) => ({
  structured: { summary, body: '', points: [], files: [], checks: [], ...more },
});
const pass = hb('통과', { verdict: 'pass', checks: ['ok'] });
const SCRIPT = {
  비서: [
    {
      call: { name: 'start_task', input: { kind: 'code', title: '검색 개선', request: 'r', size: 'small' } },
      text: '업무를 시작했습니다.',
    },
    { text: '검색을 고쳤습니다.' },
  ],
  // The write goes through the guard, so the task knows the file as its own
  개발: [
    {
      tool: { name: 'Write', input: { file_path: 'search.js' } },
      write: { file: 'search.js', text: 'v1 고침\n' },
      ...hb('수정'),
    },
  ],
  리뷰: [pass],
  시험: [pass],
  표준: [pass],
};

test('in a git project a file named in the log opens its diff in a popup', async () => {
  const scratch = makeScratch({ 'search.js': 'v0\n' });
  const git = (...args: string[]) =>
    execFileSync('git', args, {
      cwd: scratch.project,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'u',
        GIT_AUTHOR_EMAIL: 'u@x',
        GIT_COMMITTER_NAME: 'u',
        GIT_COMMITTER_EMAIL: 'u@x',
      },
    });
  git('init', '-q');
  git('add', '-A');
  git('commit', '-q', '-m', 'start');
  const app = await launchApp(scratch.db, SCRIPT);
  const page = await openProject(app, scratch.project);
  await page.getByLabel('메시지').fill('검색 고쳐줘');
  await page.getByLabel('메시지').press('Enter');
  await expect(page.getByText('검색을 고쳤습니다.')).toBeVisible({ timeout: 15_000 });

  await page.getByRole('tab', { name: '로그' }).click();
  await page.getByRole('button', { name: /개발 완료/ }).click();
  await page.getByRole('button', { name: 'search.js' }).click();
  const popup = page.getByRole('dialog');
  await expect(popup.getByRole('heading')).toHaveText('search.js');
  await expect(popup).toContainText('검색 개선 · v1 · 수정');
  await expect(popup.locator('.diff-line[data-kind="del"]')).toHaveText('-v0');
  await expect(popup.locator('.diff-line[data-kind="add"]')).toHaveText('+v1 고침');
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0);
  await app.close();
});
