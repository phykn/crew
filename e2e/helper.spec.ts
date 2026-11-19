import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

const SCRIPT = {
  비서: [
    { call: { name: 'read_help', input: {} }, text: '{{result}}' },
    { call: { name: 'ask_helper', input: { request: '편집기 열어줘' } }, text: '{{result}}' },
  ],
  도우미: [{ call: { name: 'open_workflow_editor', input: { kind: 'code' } }, text: '편집 화면을 열었습니다.' }],
};

test('비서 answers from the help and 도우미 opens this project\'s workflow editor', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, SCRIPT);
  const page = await openProject(app, scratch.project);
  await page.getByLabel('메시지').fill('워크플로우는 어디서 바꿔?');
  await page.getByLabel('메시지').press('Enter');
  await expect(page.locator('.messages')).toContainText('워크플로우** 탭');

  await page.getByLabel('메시지').fill('편집기 열어줘');
  await page.getByLabel('메시지').press('Enter');
  const editor = page.getByLabel('워크플로우 편집');
  await expect(editor).toContainText('버전 0');
  await expect(editor.getByLabel('단계 코드 리뷰')).toContainText('리뷰');
  await page.getByRole('tab', { name: '대화' }).click();
  await expect(page.locator('.messages')).toContainText('편집 화면을 열었습니다.');
  await app.close();
});
