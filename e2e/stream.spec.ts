import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

// 비서 starts its reply, then waits on a tool outside its role, so the reply is still streaming
const SCRIPT = {
  비서: [{ text: '문서를 찾아보겠습니다.', tool: { name: 'WebFetch', input: { url: 'https://example.com' } } }],
};

test('a reply still streaming keeps its first words after a look at another tab', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db, SCRIPT);
  const page = await openProject(app, scratch.project);
  await page.getByLabel('메시지').fill('문서 찾아줘');
  await page.getByLabel('메시지').press('Enter');
  const pending = page.locator('.message[data-pending]');
  await expect(pending).toHaveText('문서를 찾아보겠습니다.');

  await page.getByRole('tab', { name: '로그' }).click();
  await page.getByRole('tab', { name: '대화' }).click();
  await expect(pending).toHaveText('문서를 찾아보겠습니다.');
  await app.close();
});
