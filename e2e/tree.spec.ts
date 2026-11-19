import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

const SCRIPT = { 비서: [{ text: '안녕하세요' }, { text: '새 세션입니다' }] };

test('/clear opens a new session and deleting a session shows what goes with it', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, SCRIPT);
  const page = await openProject(app, scratch.project);
  await page.getByLabel('메시지').fill('안녕');
  await page.getByLabel('메시지').press('Enter');
  await expect(page.getByText('안녕하세요')).toBeVisible();
  await page.getByLabel('메시지').fill('/clear');
  await page.getByLabel('메시지').press('Enter');
  await expect(page.getByLabel('세션')).toHaveText('세션 02');
  await expect(page.getByText('안녕하세요')).toHaveCount(0);

  await page.getByLabel('프로젝트').click();
  await page.getByRole('option', { name: '프로젝트 트리…' }).click();
  await expect(page.getByLabel('프로젝트 목록')).toContainText('비서');
  await page.getByRole('button', { name: '세션 01 삭제' }).click();
  // 세션 01 holds two messages and the /clear log line, and no task
  await expect(page.getByLabel('삭제 확인')).toContainText('업무 0건, 로그 1건, 메시지 2건');
  await page.getByLabel('삭제 확인').getByRole('button', { name: '삭제' }).click();
  await expect(page.getByLabel('프로젝트 목록')).not.toContainText('세션 01');
  await app.close();
});
