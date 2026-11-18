import { expect, test } from '@playwright/test';
import { answerFolderDialog, launchApp, makeScratch } from './launch';

test('an opened folder and its sessions survive a restart', async () => {
  const scratch = makeScratch();
  let app = await launchApp(scratch.db);
  let page = await app.firstWindow();
  await answerFolderDialog(app, scratch.project);

  await page.getByLabel('프로젝트').click();
  await page.getByRole('option', { name: '폴더 열기…' }).click();
  await expect(page.getByLabel('프로젝트')).toContainText('demo');
  await expect(page.getByLabel('세션')).toHaveText('세션 01');

  await page.getByLabel('세션').click();
  await page.getByRole('option', { name: '새 세션' }).click();
  await expect(page.getByLabel('세션')).toHaveText('세션 02');
  await app.close();

  app = await launchApp(scratch.db);
  page = await app.firstWindow();
  await expect(page.getByLabel('프로젝트')).toContainText('demo');
  await expect(page.getByLabel('세션')).toHaveText('세션 02');
  await page.getByLabel('세션').click();
  await expect(page.getByRole('option', { name: '세션 01' })).toBeVisible();
  await app.close();
});
