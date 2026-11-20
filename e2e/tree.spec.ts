import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { launchApp, makeScratch, openProject } from './launch';

const SCRIPT = { 비서: [{ text: '안녕하세요' }, { text: '새 세션입니다' }] };

test('a slash lists the commands, Tab completes one, /clear opens a new session, and deleting a session shows what goes with it', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, SCRIPT);
  const page = await openProject(app, scratch.project);
  await page.getByLabel('메시지').fill('안녕');
  await page.getByLabel('메시지').press('Enter');
  await expect(page.getByText('안녕하세요')).toBeVisible();
  // Picked with the arrows, Enter runs it at once
  await page.getByLabel('메시지').fill('/');
  await expect(page.getByRole('listbox', { name: '명령' })).toContainText('/workflow');
  await page.getByLabel('메시지').press('ArrowDown');
  await page.getByLabel('메시지').press('Enter');
  await expect(page.getByRole('tab', { name: '로그' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: '대화' }).click();
  await page.getByLabel('메시지').fill('/cl');
  await page.getByLabel('메시지').press('Tab');
  await expect(page.getByLabel('메시지')).toHaveValue('/clear');
  await page.getByLabel('메시지').press('Enter');
  await expect(page.getByLabel('세션')).toHaveText(/^새 대화/);
  await expect(page.getByText('안녕하세요')).toHaveCount(0);

  await page.getByRole('button', { name: '탐색기' }).click();
  await expect(page.getByLabel('프로젝트 목록')).toContainText('비서');
  await page.getByRole('button', { name: '안녕 삭제' }).click();
  // The session named 안녕 holds two messages, and no task or log line
  await expect(page.getByLabel('삭제 확인')).toContainText('업무 0건, 로그 0건, 메시지 2건');
  await page.getByLabel('삭제 확인').getByRole('button', { name: '삭제', exact: true }).click();
  await expect(page.getByLabel('프로젝트 목록')).not.toContainText('안녕');
  await app.close();
});

test('a project whose folder was deleted is marked, cannot be picked or opened at start, and is removed in the explorer', async () => {
  const scratch = makeScratch();
  const gone = path.join(path.dirname(scratch.project), 'gone');
  fs.mkdirSync(gone);
  let app = await launchApp(scratch.db);
  await openProject(app, scratch.project);
  let page = await openProject(app, gone);
  await expect(page.getByLabel('프로젝트')).toContainText('gone');
  await app.close();
  fs.rmSync(gone, { recursive: true });

  // The app starts on a project it can open, though gone was the last one
  app = await launchApp(scratch.db);
  page = await app.firstWindow();
  await expect(page.getByLabel('프로젝트')).toContainText('demo');
  await page.getByLabel('프로젝트').click();
  await expect(page.getByRole('option', { name: /gone/ })).toHaveAttribute('data-disabled', '');
  await expect(page.getByRole('option', { name: /gone/ })).toContainText('폴더 없음');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: '탐색기' }).click();
  await page.getByRole('button', { name: 'gone 삭제' }).click();
  await expect(page.getByLabel('삭제 확인')).toContainText('폴더의 파일은 그대로 둡니다');
  await page.getByLabel('삭제 확인').getByRole('button', { name: '삭제', exact: true }).click();
  await expect(page.getByLabel('프로젝트 목록')).not.toContainText('gone');
  await app.close();
});
