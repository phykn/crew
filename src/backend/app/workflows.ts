import type { Chat } from './chat';
import type { Author } from '../domain/wiki';
import { type Scope, validateWorkflow, Workflow } from '../domain/workflow';

// The shipped rules for each task kind, and each project's saved versions of them
export class Workflows {
  constructor(public chat: Chat) {}

  get shipped(): Workflow[] {
    return this.chat.crew.workflows;
  }

  // The rules a project runs for a kind: its latest saved version, or the shipped one as version 0
  current(projectId: number, kind: string) {
    const saved = this.chat.store.latestWorkflow(projectId, kind);
    if (saved) return saved;
    const shipped = this.shipped.find((w) => w.kind === kind);
    if (!shipped) throw new Error(`no workflow ${kind}`);
    return { version: 0, rules: shipped, layout: null };
  }

  // One place for the editor's and the interpreter's changes, so both make the same kind of version
  save(o: {
    projectId: number;
    kind: string;
    base: number;
    rules: unknown;
    layout?: unknown;
    by: Author;
    scope: Scope;
    taskId?: number;
    // Why, kept with the version
    reason?: string;
  }) {
    const { store, emit } = this.chat;
    const parsed = Workflow.safeParse(o.rules);
    if (!parsed.success)
      return {
        ok: false as const,
        problems: parsed.error.issues.map((i) => ({ code: 'wf.schema', text: `${i.path.join('.')}: ${i.message}` })),
      };
    const rules = { ...parsed.data, kind: o.kind };
    const keys = store
      .listMembers(o.projectId)
      .filter((m) => m.status === 'hired')
      .map((m) => m.key);
    const problems = validateWorkflow(rules, keys);
    // A broken edit is refused whole, so the last valid version stays in force
    if (problems.length) return { ok: false as const, problems };
    if (o.scope !== 'future' && !o.taskId) return { ok: false as const, problems: [{ code: 'wf.noTask' }] };
    // A rule for one task applies only to a task of this project and kind
    if (o.scope !== 'future' && !this.ownTask(o.projectId, o.kind, o.taskId!))
      return { ok: false as const, problems: [{ code: 'wf.notHere', kind: o.kind, task: o.taskId }] };
    const stale = store.transact(() => {
      if (o.scope !== 'once') {
        const version = store.addWorkflowVersion(o.projectId, o.kind, o.base, rules, o.layout, o.by.name, o.reason);
        if (version === null) return true;
      }
      if (o.taskId && o.scope !== 'future') store.writeTaskWorkflow(o.taskId, rules);
      return false;
    });
    if (stale)
      return {
        ok: false as const,
        problems: [{ code: 'wf.stale', base: o.base }],
      };
    emit('changed', { topic: 'workflows' });
    return { ok: true as const, version: this.current(o.projectId, o.kind).version };
  }

  ownTask(projectId: number, kind: string, taskId: number) {
    const { store } = this.chat;
    return store
      .listSessions(projectId)
      .some((s) => store.listTasks(s.id).some((t) => t.id === taskId && t.kind === kind));
  }
}
