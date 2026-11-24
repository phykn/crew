import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

test('the title bar switches the window to English beside the window buttons, and it opens that way again', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db);
  const page = await openProject(app, scratch.project);
  const toggle = page.getByRole('group', { name: '언어' });
  await expect(toggle.getByRole('button', { name: '한국어' })).toHaveAttribute('aria-pressed', 'true');

  // It ends where the overlay's window buttons begin, with only the bar's own gap between
  const edges = await page.evaluate(() => {
    const box = document.querySelector('.titlebar-lang')!.getBoundingClientRect();
    const bar = document.querySelector('.titlebar')!;
    return { right: box.right, gap: parseFloat(getComputedStyle(bar).paddingRight), width: innerWidth };
  });
  expect(edges.right + edges.gap).toBeCloseTo(edges.width, 0);
  expect(edges.gap).toBeGreaterThan(100);

  await toggle.getByRole('button', { name: 'ENG' }).click();
  await expect(page.getByRole('tab', { name: 'Chat' })).toBeVisible();
  await expect(page.getByLabel('Message')).toBeVisible();
  // Names handed to the main process follow, so the legend shows the English roles
  await expect(page.getByRole('button', { name: 'Interpreter settings' })).toBeVisible();
  await app.close();

  const again = await launchApp(scratch.db);
  const page2 = await again.firstWindow();
  await expect(page2.getByRole('tab', { name: 'Chat' })).toBeVisible();
  await page2.getByRole('group', { name: 'Language' }).getByRole('button', { name: '한국어' }).click();
  await expect(page2.getByRole('tab', { name: '대화' })).toBeVisible();
  await again.close();
});
