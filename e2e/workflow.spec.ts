import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { answerFolderDialog, launchApp, makeScratch, openProject } from './launch';

// One task whose 조사 has no scripted answer, so its card stays (failed) while the editor is open and closed
const SCRIPT = {
  비서: [
    {
      call: { name: 'start_task', input: { kind: 'research', title: '자료 조사', request: 'x', role: '조사' } },
      text: '시작했습니다.',
    },
    { text: '실패 보고' },
  ],
};

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
  const handle = (id: string, end: 'source' | 'target') =>
    editor.locator(`.react-flow__node[data-id="${id}"] .react-flow__handle.${end}`);
  const relink = async (from: string, to: string, cut: string) => {
    // Links from 개발 fan out and overlap at their middles, so the click goes to the named link itself
    await editor.getByLabel(cut).dispatchEvent('click');
    await editor.getByLabel('연결 끊기').click();
    await handle(from, 'source').dragTo(handle(to, 'target'));
  };

  // 시험 after 코드 리뷰 (one after the other), saved as version 1; its rework still goes to 개발
  await relink('review', 'test', '개발 → 시험');
  await expect(editor.getByLabel('코드 리뷰 → 시험')).toHaveCount(1);
  await expect(editor.getByLabel('단계 시험')).toContainText('안 되면 개발로');
  await editor.getByRole('button', { name: '저장' }).click();
  await expect(editor).toContainText('버전 1 저장');
  // Back to both after 개발, side by side, and the node moved down: version 2
  await relink('develop', 'test', '코드 리뷰 → 시험');
  const box = (await editor.getByLabel('단계 시험').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 90, { steps: 8 });
  await page.mouse.up();
  await editor.getByRole('button', { name: '저장' }).click();
  await expect(editor).toContainText('버전 2 저장');
  // Flow coordinates, which do not depend on how the view is zoomed
  const where = () =>
    editor.locator('.react-flow__node[data-id="test"]').evaluate((n) => (n as HTMLElement).style.transform);
  const moved = await where();
  await page.getByRole('tab', { name: '대화' }).click();
  await expect(page.getByLabel('업무 자료 조사')).toBeVisible();

  await open();
  await expect(editor.getByRole('button', { name: '저장' })).toHaveAttribute('title', '버전 2');
  await expect(editor.locator('.react-flow__edge')).toHaveCount(5);
  await expect(editor.getByLabel('개발 → 시험')).toHaveCount(1);
  await expect(editor.getByLabel('코드 리뷰 → 시험')).toHaveCount(0);
  expect(await where()).toBe(moved);
  await expect(page.getByLabel('세션')).toHaveText('자료 조사해줘');
  await app.close();
});

test('a version 비서 saves by talk shows in the editor that was already open', async () => {
  const scratch = makeScratch();
  const rules = JSON.parse(fs.readFileSync(path.join('crew', 'workflows', 'code.json'), 'utf-8'));
  const app = await launchApp(scratch.db, {
    비서: [
      {
        call: { name: 'change_workflow', input: { kind: 'code', base_version: 0, rules, scope: 'future' } },
        text: '{{result}}',
      },
    ],
  });
  const page = await openProject(app, scratch.project);
  await page.getByRole('tab', { name: '워크플로우' }).click();
  const editor = page.getByLabel('워크플로우 편집');
  await expect(editor.getByRole('button', { name: '저장' })).toHaveAttribute('title', '버전 0');
  await page.getByRole('tab', { name: '대화' }).click();
  await page.getByLabel('메시지').fill('워크플로우 저장해줘');
  await page.getByLabel('메시지').press('Enter');
  await expect(page.getByText('저장했습니다 (버전 1).')).toBeVisible();
  await page.getByRole('tab', { name: '워크플로우' }).click();
  await expect(editor.getByRole('button', { name: '저장' })).toHaveAttribute('title', '버전 1');
  await app.close();
});

test('leaving unsaved edits for another kind asks in the window first', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db);
  const page = await openProject(app, scratch.project);
  await page.getByRole('tab', { name: '워크플로우' }).click();
  const editor = page.getByLabel('워크플로우 편집');
  await editor.getByRole('button', { name: '단계 추가' }).click();
  await editor.getByRole('button', { name: '개선 제안' }).click();
  const ask = page.getByRole('alertdialog', { name: '저장 안 한 변경' });
  await expect(ask).toContainText('저장 안 한 변경이 사라집니다');
  await ask.getByRole('button', { name: '취소' }).click();
  await expect(editor.getByRole('button', { name: '코드 변경' })).toHaveAttribute('aria-pressed', 'true');
  await editor.getByRole('button', { name: '개선 제안' }).click();
  await ask.getByRole('button', { name: '바꾸기' }).click();
  await expect(editor.getByRole('button', { name: '개선 제안' })).toHaveAttribute('aria-pressed', 'true');
  await expect(ask).toHaveCount(0);
  await app.close();
});

test('switching project with unsaved workflow edits asks first, and staying keeps them', async () => {
  const scratch = makeScratch();
  const other = path.join(path.dirname(scratch.project), 'other');
  fs.mkdirSync(other);
  const app = await launchApp(scratch.db);
  const page = await openProject(app, scratch.project);
  await page.getByRole('tab', { name: '워크플로우' }).click();
  await page.getByRole('button', { name: '단계 추가' }).click();
  const added = page.getByLabel('단계 새 단계');
  await expect(added).toHaveCount(1);

  await answerFolderDialog(app, other);
  await page.getByLabel('프로젝트').click();
  await page.getByRole('option', { name: '폴더 열기…' }).click();
  await page.getByLabel('저장 안 한 변경').getByRole('button', { name: '취소' }).click();
  await expect(page.getByLabel('프로젝트')).toContainText('demo');
  await expect(added).toHaveCount(1);

  await page.getByLabel('프로젝트').click();
  await page.getByRole('option', { name: '폴더 열기…' }).click();
  await page.getByLabel('저장 안 한 변경').getByRole('button', { name: '바꾸기' }).click();
  await expect(page.getByLabel('프로젝트')).toContainText('other');
  await expect(added).toHaveCount(0);
  await app.close();
});

test('arranged rows keep one gap however tall a node is, and a canvas that shrinks fits again from the first step, still readable', async () => {
  const scratch = makeScratch();
  const app = await launchApp(scratch.db);
  const page = await openProject(app, scratch.project);
  await page.getByRole('tab', { name: '워크플로우' }).click();
  const editor = page.getByLabel('워크플로우 편집');
  await editor.getByRole('button', { name: '정렬' }).click();
  const box = (id: string) => editor.locator(`.react-flow__node[data-id="${id}"]`).boundingBox();
  await expect
    .poll(async () => {
      const [a, b, c] = [await box('plan'), await box('plan_review'), await box('develop')];
      return Math.abs(b!.y - (a!.y + a!.height) - (c!.y - (b!.y + b!.height)));
    })
    .toBeLessThan(1);
  // Too small to hold every step readably, the canvas keeps the words legible and starts from the first step
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(460, 900));
  await expect
    .poll(() =>
      editor.evaluate((e) => {
        const frame = e.querySelector('.workflow-canvas')!.getBoundingClientRect();
        const r = e.querySelector('.react-flow__node[data-id="plan"]')!.getBoundingClientRect();
        const zoom = new DOMMatrix(getComputedStyle(e.querySelector('.react-flow__viewport')!).transform).a;
        return (
          r.top >= frame.top &&
          r.bottom <= frame.bottom &&
          r.left >= frame.left &&
          r.right <= frame.right &&
          zoom >= 0.7 - 1e-6
        );
      }),
    )
    .toBe(true);
  await app.close();
});
