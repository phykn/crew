import { BrowserWindow, dialog, ipcMain } from 'electron';
import { z } from 'zod';
import { campState } from './camp-feed';
import type { Store } from './db';
import type { Chat } from './chat';
import { Config, type Crew, KEPT, MODELS } from './crew';

const id = z.number().int().positive();

// Every call the window can make, with the schema its arguments must pass
export function createHandlers(store: Store, crew: Crew, chat: Chat, win: () => BrowserWindow | null) {
  return {
    'projects.list': { args: z.undefined(), run: () => store.listProjects() },
    'projects.open': {
      args: z.undefined(),
      run: async () => {
        const w = win();
        const picked = w
          ? await dialog.showOpenDialog(w, { properties: ['openDirectory'] })
          : await dialog.showOpenDialog({ properties: ['openDirectory'] });
        if (picked.canceled || !picked.filePaths[0]) return null;
        const project = store.addProject(picked.filePaths[0]);
        chat.seed(project.id);
        return project;
      },
    },
    'sessions.rename': {
      args: z.object({ sessionId: id, title: z.string().trim().min(1).max(30) }),
      run: (a: { sessionId: number; title: string }) => store.nameSession(a.sessionId, a.title, false),
    },
    'sessions.clear': { args: z.object({ sessionId: id }), run: (a: { sessionId: number }) => chat.clear(a.sessionId) },
    'sessions.impact': { args: z.object({ sessionId: id }), run: (a: { sessionId: number }) => store.impact(a) },
    'sessions.delete': { args: z.object({ sessionId: id }), run: (a: { sessionId: number }) => chat.deleteSession(a.sessionId) },
    'projects.impact': { args: z.object({ projectId: id }), run: (a: { projectId: number }) => store.impact(a) },
    'projects.remove': { args: z.object({ projectId: id }), run: (a: { projectId: number }) => chat.removeProject(a.projectId) },
    // 프로젝트 → 세션 → 에이전트 세션
    'tree.list': {
      args: z.undefined(),
      run: () =>
        store.listProjects().map((project) => ({
          project,
          sessions: store.listSessions(project.id).map((session) => ({
            session,
            agents: store.listAgentTree(session.id).map((a) => {
              const m = store.readMemberById(a.memberId);
              return { ...a, role: crew.defOf(m).role, nickname: m.nickname };
            }),
          })),
        })),
    },
    'sessions.list': { args: z.object({ projectId: id }), run: (a: { projectId: number }) => store.listSessions(a.projectId) },
    'sessions.create': {
      args: z.object({ projectId: id }),
      run: (a: { projectId: number }) => store.createSession(a.projectId),
    },
    'last.read': {
      args: z.undefined(),
      run: () => JSON.parse(store.readSetting('last') ?? '{}') as { projectId?: number; sessionId?: number },
    },
    'last.write': {
      args: z.object({ projectId: id.optional(), sessionId: id.optional() }),
      run: (a: { projectId?: number; sessionId?: number }) => store.writeSetting('last', JSON.stringify(a)),
    },
    'messages.list': { args: z.object({ sessionId: id }), run: (a: { sessionId: number }) => store.listMessages(a.sessionId) },
    'messages.send': {
      args: z.object({ sessionId: id, text: z.string().trim().min(1).max(20_000) }),
      // The reply arrives through the change feed; the call only hands the message over
      run: (a: { sessionId: number; text: string }) => void chat.send(a.sessionId, a.text),
    },
    'tasks.list': { args: z.object({ sessionId: id }), run: (a: { sessionId: number }) => store.listTasks(a.sessionId) },
    'tasks.stop': { args: z.object({ id }), run: (a: { id: number }) => chat.tasks.stop(a.id) },
    'tasks.resume': { args: z.object({ id }), run: (a: { id: number }) => chat.tasks.resume(a.id) },
    'wiki.list': { args: z.object({ projectId: id }), run: (a: { projectId: number }) => chat.wiki.list(a.projectId) },
    'wiki.timeline': { args: z.object({ projectId: id }), run: (a: { projectId: number }) => chat.wiki.timeline(a.projectId) },
    'wiki.change': { args: z.object({ id }), run: (a: { id: number }) => chat.wiki.change(a.id) },
    'wiki.write': {
      args: z.object({ projectId: id, title: z.string().trim().min(1).max(60), body: z.string() }),
      run: (a: { projectId: number; title: string; body: string }) => {
        chat.wiki.write(a.projectId, a.title, a.body, { memberId: null, name: '사용자' });
        chat.emit('changed', 'wiki');
      },
    },
    'wiki.remove': {
      args: z.object({ id, releaseRule: z.boolean() }),
      run: (a: { id: number; releaseRule: boolean }) => chat.removeDoc(a.id, a.releaseRule, { memberId: null, name: '사용자' }),
    },
    'memories.list': {
      args: z.object({ projectId: id, memberId: id.optional() }),
      run: (a: { projectId: number; memberId?: number }) => chat.wiki.memories(a.projectId, a.memberId),
    },
    'usage.list': { args: z.object({ sessionId: id }), run: (a: { sessionId: number }) => store.usage(a.sessionId) },
    'workflows.kinds': { args: z.undefined(), run: () => chat.workflows.map((w) => ({ kind: w.kind, label: w.label })) },
    'workflows.read': {
      args: z.object({ projectId: id, kind: z.string() }),
      run: (a: { projectId: number; kind: string }) => chat.workflowFor(a.projectId, a.kind),
    },
    'workflows.save': {
      args: z.object({ projectId: id, kind: z.string(), base: z.number().int().min(0), rules: z.unknown(), layout: z.record(z.string(), z.object({ x: z.number(), y: z.number() })) }),
      run: (a: { projectId: number; kind: string; base: number; rules: unknown; layout: Record<string, { x: number; y: number }> }) =>
        chat.saveWorkflow({ ...a, author: '사용자', scope: 'future' }),
    },
    'camp.state': { args: z.object({ sessionId: id }), run: (a: { sessionId: number }) => campState(chat, a.sessionId) },
    'events.list': { args: z.object({ sessionId: id }), run: (a: { sessionId: number }) => store.listEvents(a.sessionId) },
    'questions.answer': {
      args: z.object({ id, choice: z.string().min(1) }),
      run: (a: { id: number; choice: string }) => chat.questions.answer(a.id, a.choice),
    },
    'members.list': {
      args: z.object({ projectId: id }),
      run: (a: { projectId: number }) => crew.describe(store.listMembers(a.projectId)),
    },
    'members.update': {
      args: z.object({
        id,
        nickname: z.string().trim().min(1).max(12).optional(),
        model: z.enum(MODELS).optional(),
        status: z.enum(['hired', 'unhired']).optional(),
      }),
      run: (a: { id: number; nickname?: string; model?: string; status?: 'hired' | 'unhired' }) => {
        // The crew stops working without 비서 or 인사, so the window cannot let them go
        if (a.status === 'unhired' && KEPT.includes(store.readMemberById(a.id).key)) throw new Error('this member cannot be let go');
        // Letting go goes through the crew, so a member at work leaves once, after its step
        if (a.status === 'unhired') chat.fire(a.id);
        if (a.status === 'hired') chat.rehire(a.id);
        store.updateMember(a.id, { ...a, status: undefined });
      },
    },
    'members.permissions': {
      args: z.object({ id }),
      run: (a: { id: number }) => ({
        settings: chat.settings(store.readMemberById(a.id)),
        kit: crew.kit,
        changes: store.listPermissionChanges(a.id),
      }),
    },
    'members.setPermissions': {
      args: z.object({ id, config: Config }),
      run: (a: { id: number; config: Config }) => chat.setPermissions(a.id, a.config),
    },
    'members.definition': {
      args: z.object({ id }),
      run: (a: { id: number }) => {
        const def = crew.defOf(store.readMemberById(a.id));
        return { role: def.role, description: def.description, instructions: def.instructions };
      },
    },
  };
}

export type Handlers = ReturnType<typeof createHandlers>;

export function registerHandlers(handlers: Handlers) {
  ipcMain.handle('call', async (_event, name: string, args: unknown) => {
    const handler = handlers[name as keyof Handlers];
    if (!handler) throw new Error(`unknown call ${name}`);
    // The window is untrusted input: nothing reaches a handler without passing its schema
    return (handler.run as (a: unknown) => unknown)(handler.args.parse(args));
  });
}
