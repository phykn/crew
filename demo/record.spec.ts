import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { launchApp, makeScratch, openProject } from '../e2e/launch';

const ASSETS = path.join(__dirname, 'video', 'assets');
const hb = (summary: string, more: Record<string, unknown> = {}) => ({
  structured: { summary, body: '', points: [], files: [], checks: [], ...more },
});
const pass = (summary: string, checks: string[] = []) => hb(summary, { verdict: 'pass', checks });
const note = (title: string, body: string, files: string[] = []) => ({
  call: { name: 'wiki_write', input: { title, body, files } },
});
// Each step takes a few seconds, long enough for the camp to show who is at work
const SCRIPT = {
  비서: [
    {
      call: {
        name: 'start_task',
        input: { kind: 'code', title: '비밀번호 찾기', request: '로그인 화면에 비밀번호 찾기 링크와 재설정 메일 추가' },
      },
      text: '업무를 열었습니다. 기획부터 시작합니다.',
    },
    { text: '비밀번호 찾기를 추가했습니다. 계획·코드 리뷰, 시험, 표준 점검을 모두 통과했습니다.' },
  ],
  기획: [
    {
      ...note('로그인 흐름', '로그인 화면에서 [[비밀번호 재설정]]으로 갑니다.', ['login.html']),
      wait: 3500,
      ...hb('계획 작성'),
    },
  ],
  리뷰: [
    { wait: 2500, ...pass('계획 통과') },
    { wait: 3500, ...pass('코드 통과') },
  ],
  개발: [
    {
      ...note('비밀번호 재설정', '재설정 링크는 [[메일 발송]]으로 보내고 30분 뒤 만료됩니다.', ['reset.js']),
      write: { file: 'reset.js', text: 'export function sendReset(email) {}\n' },
      wait: 6000,
      ...hb('재설정 링크와 메일 추가', { files: ['reset.js'] }),
    },
  ],
  시험: [
    {
      ...note('메일 발송', '시험에서는 메일을 보내지 않고 기록만 확인합니다.'),
      wait: 4000,
      ...pass('시험 통과', ['npm test → 12 passed']),
    },
  ],
  표준: [{ wait: 3000, ...pass('표준 통과') }],
};

test('record the demo', async () => {
  const scratch = makeScratch({ 'login.html': '<form></form>\n', 'package.json': '{"name":"shop"}\n' });
  const app = await launchApp(scratch.db, SCRIPT);
  const page = await app.firstWindow();
  // Playwright's own video recording stalls an Electron window, so frames come from Chrome's screencast instead
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
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
  const t0 = Date.now() / 1000;
  const marks: Record<string, number> = {};
  const mark = (name: string) => (marks[name] = Date.now() / 1000 - t0);
  await openProject(app, scratch.project);
  mark('open');
  // The crew walks in from beyond the edges
  await page.waitForTimeout(5000);
  await page.getByRole('button', { name: '크루' }).click();
  mark('type');
  await page.getByLabel('메시지').pressSequentially('로그인 화면에 비밀번호 찾기 기능 추가해줘', { delay: 70 });
  await page.getByLabel('메시지').press('Enter');
  mark('sent');
  await expect(page.getByText('비밀번호 찾기를 추가했습니다.', { exact: false })).toBeVisible({ timeout: 90_000 });
  mark('done');
  await page.waitForTimeout(2000);
  for (const [tab, then] of [
    ['로그', () => page.getByRole('button', { name: /개발 완료/ }).click()],
    ['메모리', () => page.getByRole('button', { name: '그래프' }).click()],
    ['워크플로우', async () => {}],
    ['연결', async () => {}],
  ] as const) {
    await page.getByRole('tab', { name: tab }).click();
    await then();
    mark(tab);
    await page.waitForTimeout(3000);
  }
  mark('end');
  await cdp.send('Page.stopScreencast');
  await app.close();
  // Frames come only when the picture changes, so each one is held until the next, on the same clock as the marks
  const list = shot.map(
    (f, i) => `file 'frames/${f.file}'\nduration ${((shot[i + 1]?.at ?? f.at + 0.1) - f.at).toFixed(3)}\n`,
  );
  fs.writeFileSync(path.join(ASSETS, 'frames.txt'), list.join('') + `file 'frames/${shot.at(-1)!.file}'\n`);
  // The video page uses the app's own font and animation library, served from beside it
  for (const f of ['galmuri/dist/Galmuri11.woff2', 'galmuri/dist/Galmuri11-Bold.woff2', 'gsap/dist/gsap.min.js'])
    fs.copyFileSync(path.join(__dirname, '..', 'node_modules', f), path.join(ASSETS, path.basename(f)));
  fs.writeFileSync(path.join(ASSETS, 'marks.json'), JSON.stringify({ ...marks, first: shot[0].at - t0 }, null, 2));
});
