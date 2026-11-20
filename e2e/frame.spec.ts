import { expect, test } from '@playwright/test';
import { launchApp, makeScratch, openProject } from './launch';

// The panel's lines meet by rule, not by eye: checked from the boxes' edges rather than from pixels
test('the tabs stand on one frame line, the open one hides it, and the folder spans the four tabs', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db);
  const page = await openProject(app, scratch.project);
  const edges = await page.evaluate(() => {
    const box = (sel: string) => document.querySelector(sel)!.getBoundingClientRect();
    const list = document.querySelector('.tab-list')!;
    const tabs = [...list.querySelectorAll('button')];
    const open = tabs.find((t) => t.dataset.state === 'active')!;
    return {
      line: parseFloat(getComputedStyle(list).borderBottomWidth),
      listBottom: list.getBoundingClientRect().bottom,
      tabBottoms: tabs.map((t) => t.getBoundingClientRect().bottom),
      strip: parseFloat(getComputedStyle(open, '::before').height),
      bodyTop: box('.tab-body[data-state="active"]').top,
      folder: [box('.project-picker').left, box('.project-picker').right],
      tabsSpan: [tabs[0].getBoundingClientRect().left, tabs.at(-1)!.getBoundingClientRect().right],
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
