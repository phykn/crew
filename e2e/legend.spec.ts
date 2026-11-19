import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

test('the legend lists the crew with their models, and its settings keep nickname, model, hiring, and permissions', async () => {
  const scratch = makeScratch();
  let app = await launchApp(scratch.db);
  let page = await openProject(app, scratch.project);
  const roles = ['비서', '인사', '도구', '기획', '개발', '리뷰', '시험', '표준', '조사', '그림', '도우미'];
  await expect(page.locator('.legend-row .role')).toHaveText(roles);
  await expect(page.getByLabel('개발 설정')).toContainText('Sonnet');

  // Kept roles have no hiring switch
  await page.getByLabel('비서 설정').click();
  await expect(page.getByLabel('비서 고용')).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: '닫기' }).click();

  await page.getByLabel('개발 설정').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('개발 별명').fill('망치');
  await dialog.getByLabel('개발 별명').press('Enter');
  await dialog.getByLabel('개발 모델').click();
  await page.getByRole('option', { name: 'Opus' }).click();
  await dialog.getByText('지시문').click();
  await expect(dialog).toContainText('You are the crew');
  await dialog.getByLabel('브라우저 접근').click();
  await page.getByRole('option', { name: '읽기만' }).click();
  await expect(page.getByLabel('권한 변경 기록')).toContainText('MCP +browser(읽기)');
  await dialog.getByRole('button', { name: '닫기' }).click();
  await expect(page.getByLabel('개발 설정')).toContainText('망치');
  await expect(page.getByLabel('개발 설정')).toContainText('Opus');

  await page.getByLabel('시험 설정').click();
  await page.getByLabel('시험 고용').click();
  await page.getByRole('dialog').getByRole('button', { name: '닫기' }).click();
  await expect(page.getByLabel('시험 설정')).toContainText('미고용');
  await app.close();

  app = await launchApp(scratch.db);
  page = await app.firstWindow();
  await expect(page.getByLabel('개발 설정')).toContainText('망치');
  await expect(page.getByLabel('개발 설정')).toContainText('Opus');
  await page.getByLabel('시험 설정').click();
  await page.getByLabel('시험 고용').click();
  await expect(page.getByLabel('시험 고용')).toBeChecked();
  await app.close();
});
