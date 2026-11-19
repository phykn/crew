import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

// 조사 has no scripted answer, so the task stays on record with 조사 in it
const SCRIPT = { 비서: [{ call: { name: 'start_task', input: { kind: 'research', title: '자료 조사', request: 'x', role: '조사' } }, text: '시작했습니다.' }, { text: '실패 보고' }] };
type Where = { name: string; x: number; y: number } | null;

test('a nickname change shows over the head at once, and clicking a member opens its task log', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, SCRIPT);
  const page = await openProject(app, scratch.project);
  const where = (key: string) => page.evaluate((k) => (window as unknown as { camp: (k: string) => Where }).camp(k), key);
  await expect.poll(async () => (await where('researcher'))?.name).toBe('누리');
  await page.getByLabel('조사 설정').click();
  await page.getByLabel('조사 별명').fill('나래');
  await page.getByLabel('조사 별명').press('Enter');
  await page.getByRole('dialog').getByRole('button', { name: '닫기' }).click();
  await expect.poll(async () => (await where('researcher'))?.name).toBe('나래');

  await page.getByLabel('메시지').fill('자료 조사해줘');
  await page.getByLabel('메시지').press('Enter');
  await expect(page.getByLabel('업무 자료 조사')).toBeVisible();
  // Out of the legend's way, and standing still once the camp has settled
  await page.getByRole('button', { name: '크루' }).click();
  await expect(async () => {
    const at = (await where('researcher'))!;
    await page.mouse.click(at.x, at.y);
    await expect(page.getByLabel('업무 선택')).toHaveValue('1', { timeout: 500 });
  }).toPass({ timeout: 15_000 });
  await expect(page.getByLabel('업무 로그')).toContainText('조사');
  await app.close();
});
