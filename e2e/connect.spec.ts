import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

test('the 연결 tab keeps the subscription and the API apart: the crew runs on one, and the API needs its key first', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, {});
  const page = await openProject(app, scratch.project);
  await page.getByRole('tab', { name: '연결' }).click();
  const sub = page.getByRole('region', { name: 'Claude 구독' });
  const api = page.getByRole('region', { name: 'Claude API' });
  await expect(sub.getByText('사용 중')).toBeVisible();
  await expect(api.getByRole('button', { name: '이걸로 쓰기' })).toBeDisabled();

  // The scripted crew answers as its own account, as the computer's login would
  await sub.getByRole('button', { name: '연결 확인' }).click();
  await expect(sub.getByText('연결됨')).toBeVisible();
  await expect(sub.getByRole('status')).toHaveText('Claude Code 로그인으로 연결했습니다 (script@crew.test).');

  await api.getByLabel('Anthropic API 키').fill('sk-ant-e2e');
  await api.getByRole('button', { name: '저장' }).click();
  await expect(api.getByRole('status')).toHaveText('저장한 키로 연결합니다. 쓴 만큼 청구됩니다.');
  await api.getByRole('button', { name: '이걸로 쓰기' }).click();
  await expect(api.getByText('사용 중')).toBeVisible();
  await expect(sub.getByText('사용 중')).toHaveCount(0);

  // A new key's check is not the old one's; the main process's fetch answers in place of Anthropic
  await app.evaluate(() => {
    globalThis.fetch = async () => new Response('{}', { status: 200 });
  });
  await api.getByRole('button', { name: '연결 확인' }).click();
  await expect(api.getByRole('status')).toHaveText('키가 맞습니다.');
  await api.getByLabel('Anthropic API 키').fill('sk-ant-e2e-new');
  await api.getByRole('button', { name: '저장' }).click();
  await expect(api.getByRole('status')).toHaveText('저장한 키로 연결합니다. 쓴 만큼 청구됩니다.');

  // Removing the key in use puts the crew back on the subscription
  await api.getByRole('button', { name: '키 지우기' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '지우기' }).click();
  await expect(sub.getByText('사용 중')).toBeVisible();
  await expect(api.getByRole('button', { name: '키 지우기' })).toHaveCount(0);
  await app.close();
});
