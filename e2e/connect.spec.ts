import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

test('the 연결 tab checks whose account Claude answers as, and keeps a saved key until it is removed after a question', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, {});
  const page = await openProject(app, scratch.project);
  await page.getByRole('tab', { name: '연결' }).click();
  const claude = page.getByRole('region', { name: 'Claude' });
  await expect(claude.getByRole('status')).toHaveText('키가 없으면 이 컴퓨터의 Claude Code 로그인으로 연결합니다.');

  // The scripted crew answers as its own account, as the computer's login would
  await claude.getByRole('button', { name: '연결 확인' }).click();
  await expect(claude.getByText('연결됨')).toBeVisible();
  await expect(claude.getByRole('status')).toHaveText('Claude Code 로그인으로 연결했습니다 (script@crew.test).');

  await claude.getByLabel('Anthropic API 키').fill('sk-ant-e2e');
  await claude.getByRole('button', { name: '저장' }).click();
  await expect(claude.getByRole('status')).toHaveText('저장한 키로 연결합니다.');
  await expect(claude.getByLabel('Anthropic API 키')).toHaveValue('');

  await claude.getByRole('button', { name: '키 지우기' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: '지우기' }).click();
  await expect(claude.getByRole('status')).toHaveText('키가 없으면 이 컴퓨터의 Claude Code 로그인으로 연결합니다.');
  await expect(claude.getByRole('button', { name: '키 지우기' })).toHaveCount(0);
  await app.close();
});
