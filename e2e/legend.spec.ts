import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

test('the legend lists the crew with their models, and its settings change nickname, model, hiring, and permissions', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db);
  const page = await openProject(app, scratch.project);
  const roles = ['통역', '지휘', '조사', '코드 작성', '문서 작성', '코드 검토', '문서 검토', '시험', '이미지', '기록'];
  await expect(page.locator('.legend-row .role')).toHaveText(roles);
  await expect(page.getByLabel('코드 작성 설정')).toContainText('Sonnet');
  await expect(page.locator('.legend-head')).toHaveText('크루 10명 고용');

  // Kept roles have no hiring switch
  await page.getByLabel('통역 설정').click();
  await expect(page.getByLabel('통역 고용')).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: '닫기' }).click();

  await page.getByLabel('코드 작성 설정').click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('코드 작성 별명').fill('망치');
  await dialog.getByLabel('코드 작성 별명').press('Enter');
  await dialog.getByLabel('코드 작성 모델').click();
  await page.getByRole('option', { name: 'Opus' }).click();
  await dialog.getByText('지시문').click();
  await expect(dialog).toContainText('You are the crew');
  await dialog.getByLabel('브라우저 접근').click();
  await page.getByRole('option', { name: '읽기만' }).click();
  await expect(page.getByLabel('권한 변경 기록')).toContainText('MCP +browser(읽기만)');
  await dialog.getByRole('button', { name: '닫기' }).click();
  await expect(page.getByLabel('코드 작성 설정')).toContainText('망치');
  await expect(page.getByLabel('코드 작성 설정')).toContainText('Opus');

  await page.getByLabel('시험 설정').click();
  await page.getByLabel('시험 고용').click();
  await page.getByRole('dialog').getByRole('button', { name: '닫기' }).click();
  await expect(page.getByLabel('시험 설정')).toContainText('미고용');
  await expect(page.locator('.legend-head')).toHaveText('크루 9명 고용');

  // A member let go comes back through the same switch
  await page.getByLabel('시험 설정').click();
  await page.getByLabel('시험 고용').click();
  await expect(page.getByLabel('시험 고용')).toBeChecked();
  await page.getByRole('dialog').getByRole('button', { name: '닫기' }).click();
  await expect(page.locator('.legend-head')).toHaveText('크루 10명 고용');

  // A wrong press is undone in one go, after a confirm
  await page.getByLabel('코드 작성 설정').click();
  await page.getByRole('dialog').getByRole('button', { name: '초기화' }).click();
  await page.getByLabel('초기화').getByRole('button', { name: '되돌리기' }).click();
  await expect(page.getByRole('dialog').getByLabel('브라우저 접근')).toHaveText('없음');
  await page.getByRole('dialog').getByRole('button', { name: '닫기' }).click();
  await expect(page.getByLabel('코드 작성 설정')).toContainText('모루');
  await expect(page.getByLabel('코드 작성 설정')).toContainText('Sonnet');
  await app.close();
});

test('in a narrow window the legend starts folded, so the camp stays in sight', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(460, 900));
  const page = await openProject(app, scratch.project);
  await expect(page.locator('.legend-head')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.legend-row')).toHaveCount(0);
  await page.locator('.legend-head').click();
  await expect(page.locator('.legend-row')).toHaveCount(10);
  await app.close();
});

test('a window narrowed after the start folds the legend, and widened again opens it', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db);
  const page = await openProject(app, scratch.project);
  await expect(page.locator('.legend-head')).toHaveAttribute('aria-expanded', 'true');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(460, 900));
  await expect(page.locator('.legend-head')).toHaveAttribute('aria-expanded', 'false');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1600, 900));
  await expect(page.locator('.legend-head')).toHaveAttribute('aria-expanded', 'true');
  await app.close();
});
