import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

// A 1×1 PNG, enough for the box to show and send a picture
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

test('Ctrl+Enter holds a message until 비서 is done, and 지금 보내기 sends a held one at once', async () => {
  const scratch = makeScratch();
  // The first answer waits on a card, so 비서 is still answering while more is typed
  const app = await launchApp(scratch.db, {
    비서: [
      { text: '찾아보겠습니다.', tool: { name: 'WebFetch', input: { url: 'https://example.com' } } },
      { text: '둘째에 답합니다.' },
      { text: '첫째에 답합니다.' },
    ],
  });
  const page = await openProject(app, scratch.project);
  const box = page.getByLabel('메시지');
  await box.fill('문서 찾아줘');
  await box.press('Enter');
  await expect(page.locator('.message[data-pending]')).toHaveText('찾아보겠습니다.');

  await box.fill('첫째');
  await box.press('Control+Enter');
  await box.fill('둘째');
  await box.press('Control+Enter');
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

test('a chosen picture can be taken back, goes without words, and shows in the message', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, { 비서: [{ text: '그림을 받았습니다.' }] });
  const page = await openProject(app, scratch.project);
  const file = { name: 'dot.png', mimeType: 'image/png', buffer: PNG };
  await page.getByLabel('그림 파일').setInputFiles([file, file]);
  await expect(page.getByLabel('첨부한 그림').locator('img')).toHaveCount(2);
  await page.getByRole('button', { name: '그림 2 빼기' }).click();
  await expect(page.getByLabel('첨부한 그림').locator('img')).toHaveCount(1);

  // A picture alone can be sent
  await page.getByRole('button', { name: '보내기' }).click();
  await expect(page.getByLabel('첨부한 그림')).toHaveCount(0);
  await expect(page.getByLabel('나').locator('img')).toHaveCount(1);
  await expect(page.getByLabel('비서').filter({ hasText: '그림을 받았습니다.' })).toBeVisible();
  await app.close();
});
