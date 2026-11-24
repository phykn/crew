import { expect, test } from 'vitest';
import { never, openChat } from '../support';

test('rule versions: broken or stale saves are refused, and each scope reaches only its tasks', () => {
  const { store, chat, p, s } = openChat({ 지휘: [never, never, never] });
  const base = chat.workflows.current(p.id, 'code');
  const save = (rules: unknown, o: { base?: number; scope?: 'future' | 'current' | 'once'; taskId?: number } = {}) =>
    chat.workflows.save({
      projectId: p.id,
      kind: 'code',
      base: o.base ?? chat.workflows.current(p.id, 'code').version,
      rules,
      by: { memberId: null, name: 'test' },
      scope: o.scope ?? 'future',
      taskId: o.taskId,
    });
  const withDocs = {
    ...base.rules,
    steps: [
      ...base.rules.steps,
      {
        id: 'docs',
        role: 'researcher',
        label: '문서 확인',
        does: '문서 확인',
        after: ['develop'],
        verdict: true,
        rework: 'develop',
      },
    ],
  };
  const ids = (taskId: number) => store.readTask(taskId).workflow.steps.map((x) => x.id);

  const cyclic = {
    ...base.rules,
    steps: base.rules.steps.map((x) => (x.id === 'plan' ? { ...x, after: ['test'] } : x)),
  };
  expect(save(cyclic)).toMatchObject({ ok: false, problems: [{ code: 'wf.cycle' }] });
  const dangling = {
    ...base.rules,
    steps: [...base.rules.steps, { id: 'x', role: 'tester', label: 'x', does: 'x', after: ['nope'] }],
  };
  expect(save(dangling).ok).toBe(false);
  expect(chat.workflows.current(p.id, 'code').version).toBe(0);

  const running = chat.tasks.start(s.id, 'code', '진행 중', 'r');
  expect(save(withDocs)).toEqual({ ok: true, version: 1 });
  // Saved from version 0 again: it would overwrite version 1, so it is refused
  expect(save(base.rules, { base: 0 }).ok).toBe(false);
  expect(ids(running.id)).not.toContain('docs');
  expect(ids(chat.tasks.start(s.id, 'code', '새 업무', 'r').id)).toContain('docs');

  const lean = {
    ...base.rules,
    steps: base.rules.steps
      .filter((x) => x.id !== 'plan_review')
      .map((x) => ({
        ...x,
        after: x.after.filter((a) => a !== 'plan_review').concat(x.id === 'develop' ? ['plan'] : []),
      })),
  };
  expect(save(lean, { scope: 'once', taskId: running.id }).ok).toBe(true);
  expect(ids(running.id)).not.toContain('plan_review');
  expect(chat.workflows.current(p.id, 'code').version).toBe(1);
  expect(save(base.rules, { scope: 'current', taskId: running.id })).toEqual({ ok: true, version: 2 });
  expect(ids(running.id)).toContain('plan_review');
});

test('a document tied to a rule deletes alone, or with its rule put back as it was before', () => {
  const { chat, p } = openChat();
  const user = { memberId: null, name: '사용자' };
  const code = chat.workflows.current(p.id, 'code').rules;
  const lean = { ...code, steps: code.steps.filter((s) => s.id !== 'test') };
  const link = (version: number) =>
    chat.wiki.write(p.id, `워크플로우 ${version}`, '이유', user, { kind: 'code', version });
  chat.workflows.save({
    projectId: p.id,
    kind: 'code',
    base: 0,
    rules: lean,
    by: { memberId: null, name: '통역' },
    scope: 'future',
  });
  chat.workflows.removeDoc(link(1).id, false, user);
  expect(chat.workflows.current(p.id, 'code')).toMatchObject({ version: 1, rules: { steps: lean.steps } });
  chat.workflows.removeDoc(link(1).id, true, user);
  expect(chat.workflows.current(p.id, 'code').version).toBe(2);
  expect(chat.workflows.current(p.id, 'code').rules.steps.map((s) => s.id)).toContain('test');
});
