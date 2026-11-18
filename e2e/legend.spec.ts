import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

test('the legend lists the crew and keeps nickname, model, and hiring changes', async () => {
  const scratch = makeScratch();
  let app = await launchApp(scratch.db);
  let page = await openProject(app, scratch.project);
  const roles = ['비서', '인사', '도구', '기획', '개발', '리뷰', '시험', '표준', '조사', '그림'];
  await expect(page.locator('.legend-table tbody tr .role')).toHaveText(roles);
  await expect(page.getByLabel('비서 고용')).toBeDisabled();
  await expect(page.getByRole('row', { name: '개발' }).locator('.kit-icon')).toHaveCount(2);

  await page.getByLabel('개발 별명').fill('망치');
  await page.getByLabel('개발 별명').press('Enter');
  await page.getByLabel('개발 모델').click();
  await page.getByRole('option', { name: 'Opus' }).click();
  await page.getByLabel('시험 고용').click();
  await expect(page.getByRole('row', { name: '시험' })).toContainText('미고용');

  await page.getByLabel('개발 정의').click();
  await expect(page.getByRole('dialog')).toContainText('You are the crew');
  await page.getByRole('dialog').getByLabel('브라우저 접근').selectOption('read');
  await expect(page.getByLabel('권한 변경 기록')).toContainText('MCP +browser(읽기)');
  await page.getByRole('button', { name: '닫기' }).click();
  await expect(page.getByRole('row', { name: '개발' }).locator('.kit-icon')).toHaveCount(3);
  await app.close();

  app = await launchApp(scratch.db);
  page = await app.firstWindow();
  await expect(page.getByLabel('개발 별명')).toHaveValue('망치');
  await expect(page.getByLabel('개발 모델')).toHaveText('Opus');
  await page.getByRole('row', { name: '시험' }).getByRole('button', { name: '재고용' }).click();
  await expect(page.getByLabel('시험 고용')).toBeChecked();
  await app.close();
});
