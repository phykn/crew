import { expect, test } from '@playwright/test';
import { launchApp, makeScratch } from './launch';

// A part whose look changes without the baseline changing too fails here
test('the parts gallery opens only with CREW_GALLERY=1, and every part matches its baseline image', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, undefined, { CREW_GALLERY: '1' });
  const page = await app.firstWindow();
  await page.mouse.move(0, 0);
  const sections = page.locator('.gallery-section');
  await expect(sections).toHaveCount(6);
  for (const name of ['버튼', '묶기', '고르기', '입력과 표시', '색 역할', '척도'])
    await expect(page.getByRole('region', { name })).toHaveScreenshot(`${name}.png`);

  // Pointed at and reached by keyboard: the two states a still picture cannot show
  const buttons = page.getByRole('region', { name: '버튼' });
  await buttons.getByRole('button', { name: '기본' }).first().hover();
  await expect(buttons.locator('.gallery-line').first()).toHaveScreenshot('hover.png');
  await page.mouse.move(0, 0);
  await buttons.getByRole('button', { name: '기본' }).first().focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(buttons.locator('.gallery-line').first()).toHaveScreenshot('focus.png');

  await page.getByRole('button', { name: '대화상자 열기' }).click();
  await expect(page.getByRole('dialog')).toHaveScreenshot('dialog.png');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '확인 창 열기' }).click();
  await expect(page.getByRole('alertdialog')).toHaveScreenshot('confirm.png');
  await app.close();

  // Started as usual, the window is the app and nothing reaches the gallery
  const usual = await launchApp(makeScratch().db);
  const window = await usual.firstWindow();
  await expect(window.locator('.app')).toBeVisible();
  await expect(window.locator('.gallery')).toHaveCount(0);
  await usual.close();
});
