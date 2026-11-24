import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from '../e2e/launch';
import { record } from './record';

const hb = (summary: string, more: Record<string, unknown> = {}) => ({
  structured: { summary, body: '', points: [], files: [], checks: [], ...more },
});
const pass = (summary: string, checks: string[] = []) => hb(summary, { verdict: 'pass', checks });

// Each step takes a few seconds, long enough for the camp to show who is at work
const SCRIPT = {
  통역: [
    {
      call: {
        name: 'start_task',
        input: {
          original: '비밀번호 찾기 넣어줘',
          kind: 'code',
          title: '비밀번호 찾기',
          request: '로그인 화면에 비밀번호 찾기 링크와 재설정 메일 추가',
        },
      },
      text: '업무를 열었습니다. 지휘부터 시작합니다.',
    },
    { text: '비밀번호 찾기를 추가했습니다. 계획, 코드 검토, 시험, 표준 점검을 모두 통과했습니다.' },
  ],
  지휘: [{ wait: 3500, ...hb('계획 작성') }],
  '코드 검토': [
    { wait: 2500, ...pass('계획 통과') },
    { wait: 3500, ...pass('코드 통과') },
  ],
  '코드 작성': [
    {
      write: { file: 'reset.js', text: 'export function sendReset(email) {}\n' },
      wait: 6000,
      ...hb('재설정 링크와 메일 추가', { files: ['reset.js'] }),
    },
  ],
  시험: [{ wait: 4000, ...pass('시험 통과', ['npm test → 12 passed']) }],
  // The wiki is the librarian's alone to write, so the note comes after the task rather than from a step
  사서: [
    {
      wait: 1200,
      call: {
        name: 'wiki_write',
        input: {
          title: '비밀번호 재설정',
          body: '로그인 화면에서 [[비밀번호 찾기]]로 갑니다.\n\n재설정 링크는 메일로 보내고 30분 뒤 만료됩니다.',
        },
      },
    },
  ],
};

test('record the demo', async () => {
  const scratch = makeScratch({ 'login.html': '<form></form>\n', 'package.json': '{"name":"shop"}\n' });
  const app = await launchApp(scratch.db, SCRIPT);
  const page = await app.firstWindow();
  const take = await record(page);
  await openProject(app, scratch.project);
  take.mark('open');
  // The crew walks in from beyond the edges
  await page.waitForTimeout(5000);
  await page.getByRole('button', { name: '크루' }).click();
  take.mark('type');
  await page.getByLabel('메시지').pressSequentially('로그인 화면에 비밀번호 찾기 기능 추가해줘', { delay: 70 });
  await page.getByLabel('메시지').press('Enter');
  take.mark('sent');
  await expect(page.getByText('비밀번호 찾기를 추가했습니다.', { exact: false })).toBeVisible({ timeout: 90_000 });
  take.mark('done');
  await page.waitForTimeout(2000);
  for (const [tab, then] of [
    ['로그', () => page.getByRole('button', { name: /코드 작성 완료/ }).click()],
    ['메모리', () => page.getByRole('button', { name: '그래프' }).click()],
    ['워크플로우', async () => {}],
    ['연결', async () => {}],
  ] as const) {
    await page.getByRole('tab', { name: tab }).click();
    await then();
    take.mark(tab);
    await page.waitForTimeout(3000);
  }
  await take.finish(app);
});
