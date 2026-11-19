import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

// One task whose 조사 has no scripted answer, so its card stays (failed) while the editor is open and closed
const SCRIPT = { 비서: [{ call: { name: 'start_task', input: { kind: 'research', title: '자료 조사', request: 'x', role: '조사' } }, text: '시작했습니다.' }, { text: '실패 보고' }] };

test('the editor saves review and test in parallel after 개발 as a new version, keeps the layout, and leaves the session as it was', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, SCRIPT);
  const page = await openProject(app, scratch.project);
  await page.getByLabel('메시지').fill('자료 조사해줘');
  await page.getByLabel('메시지').press('Enter');
  await expect(page.getByLabel('업무 자료 조사')).toBeVisible();

  const open = async () => {
    await page.getByRole('tab', { name: '워크플로우' }).click();
  };
  await open();
  const editor = page.getByLabel('워크플로우 편집');
  await expect(editor.getByLabel('단계 개발')).toContainText('개발');
  const side = editor.getByLabel('선행 단계');

  // 시험 after 코드 리뷰 (one after the other), saved as version 1
  await editor.getByLabel('단계 시험').click();
  await side.getByLabel('개발').uncheck();
  await side.getByLabel('코드 리뷰').check();
  await editor.getByRole('button', { name: '저장' }).click();
  await expect(editor).toContainText('버전 1로 저장했습니다');
  // Back to both after 개발, side by side, and the node moved down: version 2
  await editor.getByLabel('단계 시험').click();
  await side.getByLabel('코드 리뷰').uncheck();
  await side.getByLabel('개발').check();
  const box = (await editor.getByLabel('단계 시험').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 90, { steps: 8 });
  await page.mouse.up();
  await editor.getByRole('button', { name: '저장' }).click();
  await expect(editor).toContainText('버전 2로 저장했습니다');
  // Flow coordinates, which do not depend on how the view is zoomed
  const where = () => editor.locator('.react-flow__node[data-id="test"]').evaluate((n) => (n as HTMLElement).style.transform);
  const moved = await where();
  await page.getByRole('tab', { name: '대화' }).click();
  await expect(page.getByLabel('업무 자료 조사')).toBeVisible();

  await open();
  await expect(editor).toContainText('버전 2');
  await expect(editor.locator('.react-flow__edge')).toHaveCount(4);
  await editor.getByLabel('단계 시험').click();
  await expect(side.getByLabel('개발')).toBeChecked();
  await expect(side.getByLabel('코드 리뷰')).not.toBeChecked();
  expect(await where()).toBe(moved);
  await expect(page.getByLabel('세션')).toHaveText('자료 조사해줘');
  await app.close();
});
