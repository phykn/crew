import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

const SCRIPT = {
  통역: [
    { call: { name: 'app_read', input: { action: 'help', args: {} } }, text: '{{result}}' },
    {
      call: { name: 'app_act', input: { action: 'open.workflow', args: { kind: 'code' } } },
      text: '편집 화면을 열었습니다.',
    },
  ],
};

test("통역 answers from the help and opens this project's workflow editor", async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, SCRIPT);
  const page = await openProject(app, scratch.project);
  await page.getByLabel('메시지').fill('워크플로우는 어디서 바꿔?');
  await page.getByLabel('메시지').press('Enter');
  await expect(page.locator('.messages')).toContainText('tab on the right edits the steps');

  await page.getByLabel('메시지').fill('편집기 열어줘');
  await page.getByLabel('메시지').press('Enter');
  const editor = page.getByLabel('워크플로우 편집');
  await expect(editor.getByRole('button', { name: '저장' })).toHaveAttribute('title', '버전 0');
  await expect(editor.getByLabel('단계 코드 검토')).toContainText('코드 검토');
  await page.getByRole('tab', { name: '대화' }).click();
  await expect(page.locator('.messages')).toContainText('편집 화면을 열었습니다.');
  await app.close();
});

test('a mode 통역 changes, once the user allows it on the card, shows by the input', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, {
    통역: [{ call: { name: 'app_act', input: { action: 'mode.set', args: { mode: 'auto' } } }, text: '{{result}}' }],
  });
  const page = await openProject(app, scratch.project);
  await expect(page.getByLabel('승인 모드')).toHaveText('묻기');
  await page.getByLabel('메시지').fill('승인 모드 자동으로 바꿔줘');
  await page.getByLabel('메시지').press('Enter');
  await page.getByRole('button', { name: '허용' }).click();
  await expect(page.locator('.messages')).toContainText('The approval mode is now auto.');
  await expect(page.getByLabel('승인 모드')).toHaveText('자동');
  await app.close();
});

test('a reply that comes while the window is in the background shows as a notification', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, { 통역: [{ text: '업무가 끝났습니다.' }] });
  const page = await openProject(app, scratch.project);
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0].isFocused = () => false;
  });
  await page.getByLabel('메시지').fill('끝나면 알려줘');
  await page.getByLabel('메시지').press('Enter');
  await expect(page.locator('.messages')).toContainText('업무가 끝났습니다.');
  expect(await app.evaluate(() => (globalThis as unknown as { shown: string[] }).shown)).toEqual([
    '업무가 끝났습니다.',
  ]);
  await app.close();
});
