import { expect, type Page, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

// A 1×1 PNG, enough for the box to show and send a picture
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

// 비서's first answer waits on a card, so it is still answering while more is typed
const WAITING = { text: '찾아보겠습니다.', tool: { name: 'WebFetch', input: { url: 'https://example.com' } } };

async function startWaiting(page: Page) {
  await page.getByLabel('메시지').fill('문서 찾아줘');
  await page.getByLabel('메시지').press('Enter');
  await expect(page.locator('.message[data-pending]')).toHaveText('찾아보겠습니다.');
}

async function hold(page: Page, text: string) {
  await page.getByLabel('메시지').fill(text);
  await page.getByLabel('메시지').press('Control+Enter');
}

test('Ctrl+Enter holds a message until 비서 is done, and 지금 보내기 sends a held one at once', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, {
    비서: [WAITING, { text: '둘째에 답합니다.' }, { text: '첫째에 답합니다.' }],
  });
  const page = await openProject(app, scratch.project);
  await startWaiting(page);
  await hold(page, '첫째');
  await hold(page, '둘째');
  const held = page.getByLabel('대기 중');
  await expect(held).toHaveCount(2);

  await held.filter({ hasText: '둘째' }).getByRole('button', { name: '지금 보내기' }).click();
  await expect(held).toHaveCount(1);
  await expect(page.getByLabel('나').filter({ hasText: '둘째' })).toBeVisible();

  await page.getByRole('button', { name: '허용' }).click();
  await expect(page.getByLabel('비서').filter({ hasText: '첫째에 답합니다.' })).toBeVisible();
  await expect(held).toHaveCount(0);
  await app.close();
});

test('stopping 비서 sends the held message at once', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, { 비서: [WAITING, { text: '나중 것에 답합니다.' }] });
  const page = await openProject(app, scratch.project);
  await startWaiting(page);
  await hold(page, '나중에');
  await page.getByRole('button', { name: '중지' }).click();
  await expect(page.getByLabel('비서').filter({ hasText: '나중 것에 답합니다.' })).toBeVisible();
  await expect(page.getByLabel('대기 중')).toHaveCount(0);
  await app.close();
});

test('a held message waits for the answer still under way after a visit to another session', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, { 비서: [WAITING, { text: '나중 것에 답합니다.' }] });
  const page = await openProject(app, scratch.project);
  await startWaiting(page);
  await hold(page, '나중에');
  await page.getByLabel('세션').click();
  await page.getByRole('option', { name: '새 세션' }).click();
  await expect(page.getByLabel('대기 중')).toHaveCount(0);
  await page.getByLabel('세션').click();
  await page.getByRole('option', { name: '문서 찾아줘' }).click();

  await expect(page.locator('.message[data-pending]')).toBeVisible();
  await expect(page.getByLabel('대기 중')).toHaveCount(1);
  await page.getByRole('button', { name: '허용' }).click();
  await expect(page.getByLabel('비서').filter({ hasText: '나중 것에 답합니다.' })).toBeVisible();
  await expect(page.getByLabel('대기 중')).toHaveCount(0);
  await app.close();
});

test('a chosen picture can be taken back, goes without words, and shows in the message', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, { 비서: [{ text: '그림을 받았습니다.' }] });
  const page = await openProject(app, scratch.project);
  const file = { name: 'dot.png', mimeType: 'image/png', buffer: PNG };
  await page.getByLabel('그림 파일').setInputFiles([file, file]);
  await expect(page.getByLabel('첨부한 그림').locator('img')).toHaveCount(2);
  await page.getByRole('button', { name: '그림 2 빼기' }).click();
  await expect(page.getByLabel('첨부한 그림').locator('img')).toHaveCount(1);

  await page.getByRole('button', { name: '보내기' }).click();
  await expect(page.getByLabel('첨부한 그림')).toHaveCount(0);
  // A sent picture loads from its own address, not from the message list
  await expect
    .poll(() =>
      page
        .getByLabel('나')
        .locator('img')
        .evaluate((i: HTMLImageElement) => i.naturalWidth),
    )
    .toBe(1);
  await expect(page.getByLabel('비서').filter({ hasText: '그림을 받았습니다.' })).toBeVisible();
  await app.close();
});

test('a picture pasted from the clipboard joins the message', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db);
  const page = await openProject(app, scratch.project);
  // The paste carries its own picture, so the user's system clipboard is never touched
  await page.getByLabel('메시지').evaluate((box, png) => {
    const data = new DataTransfer();
    const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
    data.items.add(new File([bytes], 'shot.png', { type: 'image/png' }));
    box.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }));
  }, PNG.toString('base64'));
  await expect(page.getByLabel('첨부한 그림').locator('img')).toHaveCount(1);
  await expect(page.getByLabel('메시지')).toHaveValue('');
  await app.close();
});

test('the window never leaves the app for a file, as a drop outside the input would make it', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db);
  const page = await openProject(app, scratch.project);
  const before = page.url();
  await page.evaluate(() => (location.href = 'file:///C:/dropped.png'));
  await page.waitForTimeout(500);
  expect(page.url()).toBe(before);
  expect(await page.evaluate(() => !!document.querySelector('.composer'))).toBe(true);
  await app.close();
});

test('a long message grows the box upward and wraps inside it, never wider than the chat', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db);
  const page = await openProject(app, scratch.project);
  const box = page.locator('.composer');
  const before = (await box.boundingBox())!;
  const line = '줄을 넘기는 긴 문장입니다 '.repeat(12);
  await page.getByLabel('메시지').fill([line, line, line, 'x'.repeat(400)].join('\n'));
  const after = (await box.boundingBox())!;
  // Upward only: the same left and right edges, taller than one line
  expect(Math.abs(after.x - before.x)).toBeLessThan(1);
  expect(Math.abs(after.width - before.width)).toBeLessThan(1);
  expect(after.height).toBeGreaterThan(before.height);
  const text = (await page.getByLabel('메시지').boundingBox())!;
  expect(text.x + text.width).toBeLessThanOrEqual(after.x + after.width + 0.5);
  await app.close();
});
