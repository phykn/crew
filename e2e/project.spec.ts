import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { launchApp, makeScratch, openProject } from './launch';

// Scripted, so the first message never reaches a real model
const SCRIPT = { 비서: [{ text: '네' }] };

test('an opened folder and its named sessions survive a restart', async () => {
  const scratch = makeScratch();
  let app = await launchApp(scratch.db, SCRIPT);
  let page = await openProject(app, scratch.project);
  await expect(page.getByLabel('프로젝트')).toContainText('demo');
  await expect(page.getByLabel('세션')).toHaveText(/^새 대화/);

  await page.getByLabel('세션').click();
  await page.getByRole('option', { name: '새 세션' }).click();
  await page.getByLabel('메시지').fill('로그인 화면 만들어줘');
  await page.getByLabel('메시지').press('Enter');
  // A session takes its name from the first thing asked in it
  await expect(page.getByLabel('세션')).toHaveText('로그인 화면 만들어줘');
  await app.close();

  app = await launchApp(scratch.db);
  page = await app.firstWindow();
  await expect(page.getByLabel('프로젝트')).toContainText('demo');
  await expect(page.getByLabel('세션')).toHaveText('로그인 화면 만들어줘');
  await page.getByLabel('세션').click();
  await expect(page.getByRole('option', { name: /^새 대화/ })).toBeVisible();
  await app.close();
});

test("a newly opened folder shows only its own session, never the last folder's", async () => {
  const scratch = makeScratch();
  const other = path.join(path.dirname(scratch.project), 'other');
  fs.mkdirSync(other);
  const app = await launchApp(scratch.db, SCRIPT);
  let page = await openProject(app, scratch.project);
  await page.getByLabel('메시지').fill('로그인 화면 만들어줘');
  await page.getByLabel('메시지').press('Enter');
  await expect(page.getByLabel('세션')).toHaveText('로그인 화면 만들어줘');

  page = await openProject(app, other);
  await expect(page.getByLabel('프로젝트')).toContainText('other');
  await expect(page.getByLabel('세션')).toHaveText(/^새 대화/);
  await page.getByLabel('세션').click();
  // The menu lists other sessions of this folder only, and this new folder has none
  await expect(page.getByRole('option', { name: '새 세션' })).toBeVisible();
  await expect(page.getByRole('option', { name: '로그인 화면 만들어줘' })).toHaveCount(0);
  await app.close();
});
