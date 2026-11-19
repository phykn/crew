import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

test('the legend lists the crew and keeps nickname, model, and hiring changes', async () => {
  const scratch = makeScratch();
  let app = await launchApp(scratch.db);
  let page = await openProject(app, scratch.project);
  const roles = ['비서', '인사', '도구', '기획', '개발', '리뷰', '시험', '표준', '조사', '그림', '도우미'];
  await expect(page.locator('.legend-table tbody tr .role')).toHaveText(roles);
  await expect(page.getByLabel('비서 고용')).toBeDisabled();
  await page.getByLabel('시험 고용').click();
  await expect(page.getByRole('row', { name: '시험' })).toContainText('미고용');

  // Nickname, model, and permissions live in one settings dialog per member
  await page.getByLabel('개발 설정').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('개발 별명').fill('망치');
  await dialog.getByLabel('개발 별명').press('Enter');
  await dialog.getByLabel('개발 모델').click();
  await page.getByRole('option', { name: 'Opus' }).click();
  await dialog.getByText('지시문 원문 보기').click();
  await expect(dialog).toContainText('You are the crew');
  await dialog.getByLabel('브라우저 접근').selectOption('read');
  await expect(page.getByLabel('권한 변경 기록')).toContainText('MCP +browser(읽기)');
  await dialog.getByRole('button', { name: '닫기' }).click();
  await expect(page.getByRole('row', { name: '개발' })).toContainText('망치');
  await app.close();

  app = await launchApp(scratch.db);
  page = await app.firstWindow();
  await page.getByLabel('개발 설정').click();
  await expect(page.getByLabel('개발 별명')).toHaveValue('망치');
  await expect(page.getByLabel('개발 모델')).toHaveText('Opus');
  await page.getByRole('dialog').getByRole('button', { name: '닫기' }).click();
  await page.getByLabel('시험 고용').click();
  await expect(page.getByLabel('시험 고용')).toBeChecked();
  await app.close();
});
