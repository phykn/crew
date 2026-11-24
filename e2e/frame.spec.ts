import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

// The panel's lines meet by rule, not by eye: checked from the boxes' edges rather than from pixels
test('the tabs stand on one frame line, the open one hides it, and the folder spans the first four tabs', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db);
  const page = await openProject(app, scratch.project);
  const edges = await page.evaluate(() => {
    const box = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
    const list = document.querySelector('.ui-tab-list')!;
    const tabs = [...list.querySelectorAll('button')];
    const open = tabs.find((t) => t.dataset.state === 'active')!;
    return {
      line: parseFloat(getComputedStyle(list).borderBottomWidth),
      listBottom: list.getBoundingClientRect().bottom,
      tabBottoms: tabs.map((t) => t.getBoundingClientRect().bottom),
      strip: parseFloat(getComputedStyle(open, '::before').height),
      bodyTop: box('.tab-body[data-state="active"]').top,
      folder: [box('.project-picker').left, box('.project-picker').right],
      tabsSpan: [tabs[0].getBoundingClientRect().left, tabs[3].getBoundingClientRect().right],
    };
  });
  // Every tab ends where the line begins, so the line is drawn once and never steps
  for (const bottom of edges.tabBottoms) expect(bottom).toBeCloseTo(edges.listBottom - edges.line, 1);
  expect(edges.strip).toBeGreaterThanOrEqual(edges.line);
  expect(edges.bodyTop).toBeCloseTo(edges.listBottom, 1);
  expect(edges.folder[0]).toBeCloseTo(edges.tabsSpan[0], 1);
  expect(edges.folder[1]).toBeCloseTo(edges.tabsSpan[1], 1);
  await app.close();
});

test("the message box's words span its width above one row of buttons, a mouse-picked tab shows no keyboard ring, and a narrow panel keeps room for the session name", async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db);
  const page = await openProject(app, scratch.project);
  const box = async (sel: string) => (await page.locator(sel).boundingBox())!;
  await expect(page.getByLabel('메시지')).toHaveAttribute('placeholder', '통역에게 할 일을 말하세요');
  // The words run from the attach button's left edge to the send button's right edge, and the buttons sit below them
  const [text, attach, send] = [
    await box('.composer-text'),
    await box('.composer [aria-label="그림 첨부"]'),
    await box('.composer .ui-button--primary'),
  ];
  expect(text.x).toBeCloseTo(attach.x, 0);
  expect(text.x + text.width).toBeCloseTo(send.x + send.width, 0);
  expect(send.y).toBeGreaterThanOrEqual(text.y + text.height);
  expect(attach.y + attach.height / 2).toBeCloseTo(send.y + send.height / 2, 0);
  await page.getByRole('tab', { name: '로그' }).click();
  // Picked from the message box, which always shows focus, so only the drawn outline tells
  await expect(page.getByRole('tab', { name: '로그' })).toHaveCSS('outline-style', 'none');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: '메모리' })).not.toHaveCSS('outline-style', 'none');
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1100, 800));
  await expect
    .poll(() =>
      page.evaluate(() => {
        const least = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--w-session-min'));
        return document.querySelector('.session-picker')!.getBoundingClientRect().width - least;
      }),
    )
    .toBeGreaterThanOrEqual(-0.5);
  await app.close();
});

test('every tab shows its name on one line, the open one in bold too', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db);
  const page = await openProject(app, scratch.project);
  for (const name of ['대화', '로그', '메모리', '워크플로우']) {
    await page.getByRole('tab', { name }).click();
    const fits = await page
      .locator('.ui-tab .ui-tab-name')
      .evaluateAll((spans) =>
        spans.every((s) => s.getClientRects().length === 1 && s.scrollWidth <= s.parentElement!.clientWidth),
      );
    expect(fits).toBe(true);
  }
  await app.close();
});
