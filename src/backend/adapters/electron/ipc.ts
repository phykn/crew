import { BrowserWindow, dialog, ipcMain } from 'electron';
import { z } from 'zod';
import { campState } from './camp';
import type { Chat } from '../../app/chat';
import { Config } from '../../domain/crew';
import { PROVIDERS } from '../../domain/providers';
import { IMAGE_TYPES, MODELS, MODES } from '../../../shared';

const id = z.number().int().positive();
const provider = z.enum(PROVIDERS.map((p) => p.id) as [(typeof PROVIDERS)[number]['id']]);
const USER = { memberId: null, name: '사용자' };

// The run's argument type comes from its schema, so the two cannot drift apart
const handle = <S extends z.ZodType, R>(args: S, run: (a: z.infer<S>) => R) => ({ args, run });

// Every call the window can make, with the schema its arguments must pass
export function createHandlers(chat: Chat, win: () => BrowserWindow | null) {
  const { store, crew, members, workflows, wiki, tasks } = chat;
  return {
    'projects.list': handle(z.undefined(), () => store.listProjects()),
    'projects.open': handle(z.undefined(), async () => {
      const w = win();
      const picked = w
        ? await dialog.showOpenDialog(w, { properties: ['openDirectory'] })
        : await dialog.showOpenDialog({ properties: ['openDirectory'] });
      if (picked.canceled || !picked.filePaths[0]) return null;
      return chat.addProject(picked.filePaths[0]);
    }),
    'projects.setMode': handle(z.object({ projectId: id, mode: z.enum(MODES) }), (a) =>
      chat.setMode(a.projectId, a.mode),
    ),
    'projects.impact': handle(z.object({ projectId: id }), (a) => store.impact(a)),
    'projects.remove': handle(z.object({ projectId: id }), (a) => chat.removeProject(a.projectId)),
    // 프로젝트 → 세션 → 에이전트 세션
    'tree.list': handle(z.undefined(), () =>
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
    ),
    'sessions.list': handle(z.object({ projectId: id }), (a) => store.listSessions(a.projectId)),
    'sessions.create': handle(z.object({ projectId: id }), (a) => chat.createSession(a.projectId)),
    'sessions.impact': handle(z.object({ sessionId: id }), (a) => store.impact(a)),
    'sessions.delete': handle(z.object({ sessionId: id }), (a) => chat.deleteSession(a.sessionId)),
    'last.read': handle(
      z.undefined(),
      () => JSON.parse(store.readSetting('last') ?? '{}') as { projectId?: number; sessionId?: number },
    ),
    'last.write': handle(z.object({ projectId: id.optional(), sessionId: id.optional() }), (a) =>
      store.writeSetting('last', JSON.stringify(a)),
    ),
    'messages.list': handle(z.object({ sessionId: id }), (a) => store.listMessages(a.sessionId)),
    // A window coming back to a session learns whether 비서 is still answering there
    'messages.busy': handle(z.object({ sessionId: id }), (a) => !!chat.runs.live(a.sessionId)),
    // The reply arrives through the change feed; the call only hands the message over
    // Words, pictures, or both; Claude takes a picture up to about 5MB
    'messages.send': handle(
      z
        .object({
          sessionId: id,
          text: z.string().trim().max(20_000),
          images: z
            .array(z.object({ mediaType: z.enum(IMAGE_TYPES), data: z.string().min(1).max(7_000_000) }))
            .max(5)
            .default([]),
        })
        .refine((a) => a.text || a.images.length),
      (a) => {
        void chat.send(a.sessionId, a.text, a.images);
      },
    ),
    // Stops only 비서's answer; tasks it started go on and have their own stop
    'messages.stop': handle(z.object({ sessionId: id }), (a) => {
      void chat.runs.live(a.sessionId)?.stop();
    }),
    'tasks.list': handle(z.object({ sessionId: id }), (a) => store.listTasks(a.sessionId)),
    'tasks.stop': handle(z.object({ id }), (a) => tasks.stop(a.id)),
    'tasks.resume': handle(z.object({ id }), (a) => tasks.resume(a.id)),
    'tasks.versions': handle(z.object({ id }), (a) => tasks.versions(a.id)),
    'changes.file': handle(z.object({ taskId: id, versionId: id, file: z.string().min(1) }), (a) =>
      tasks.change(a.taskId, a.versionId, a.file),
    ),
    'wiki.list': handle(z.object({ projectId: id }), (a) => wiki.list(a.projectId)),
    'wiki.timeline': handle(z.object({ projectId: id }), (a) => wiki.timeline(a.projectId)),
    'wiki.graph': handle(z.object({ projectId: id }), (a) => wiki.graph(a.projectId)),
    'wiki.change': handle(z.object({ id }), (a) => wiki.change(a.id)),
    'wiki.write': handle(
      z.object({ projectId: id, title: z.string().trim().min(1).max(60), body: z.string() }),
      (a) => {
        wiki.write(a.projectId, a.title, a.body, USER);
        chat.emit('changed', { topic: 'wiki' });
      },
    ),
    'wiki.remove': handle(z.object({ id, releaseRule: z.boolean() }), (a) =>
      workflows.removeDoc(a.id, a.releaseRule, USER),
    ),
    'memories.list': handle(z.object({ projectId: id, memberId: id.optional() }), (a) =>
      wiki.memories(a.projectId, a.memberId),
    ),
    'usage.list': handle(z.object({ sessionId: id }), (a) => chat.runs.spend(a.sessionId)),
    'workflows.kinds': handle(z.undefined(), () => workflows.shipped.map((w) => ({ kind: w.kind, label: w.label }))),
    'workflows.read': handle(z.object({ projectId: id, kind: z.string() }), (a) =>
      workflows.current(a.projectId, a.kind),
    ),
    'workflows.save': handle(
      z.object({
        projectId: id,
        kind: z.string(),
        base: z.number().int().min(0),
        rules: z.unknown(),
        layout: z.record(z.string(), z.object({ x: z.number(), y: z.number() })),
      }),
      (a) => workflows.save({ ...a, by: USER, scope: 'future' }),
    ),
    'camp.state': handle(z.object({ sessionId: id }), (a) => campState(chat, a.sessionId)),
    'events.list': handle(z.object({ sessionId: id }), (a) => store.listEvents(a.sessionId)),
    'questions.answer': handle(z.object({ id, choice: z.string().min(1) }), (a) =>
      chat.questions.answer(a.id, a.choice),
    ),
    'members.list': handle(z.object({ projectId: id }), (a) =>
      crew.describe(store.listMembers(a.projectId), members.kit(a.projectId)),
    ),
    'members.update': handle(
      z.object({
        id,
        nickname: z.string().trim().min(1).max(12).optional(),
        model: z.enum(MODELS).optional(),
        status: z.enum(['hired', 'unhired']).optional(),
      }),
      ({ id, ...change }) => members.update(id, change),
    ),
    'connections.list': handle(z.undefined(), () => chat.connections.list()),
    'connections.saveKey': handle(z.object({ id: provider, key: z.string().trim().min(1).max(500) }), (a) =>
      chat.connections.saveKey(a.id, a.key),
    ),
    'connections.removeKey': handle(z.object({ id: provider }), (a) => chat.connections.removeKey(a.id)),
    'connections.check': handle(z.object({ id: provider }), (a) => chat.connections.check(a.id)),
    'members.reset': handle(z.object({ id }), (a) => members.reset(a.id)),
    'members.permissions': handle(z.object({ id }), (a) => {
      const member = store.readMemberById(a.id);
      const { skills, mcp } = members.kit(member.projectId);
      return { settings: members.settings(member), kit: { skills, mcp }, changes: store.listPermissionChanges(a.id) };
    }),
    'members.setPermissions': handle(z.object({ id, config: Config }), (a) => members.setPermissions(a.id, a.config)),
    'members.definition': handle(z.object({ id }), (a) => {
      const def = crew.defOf(store.readMemberById(a.id));
      return { role: def.role, description: def.description, instructions: def.instructions };
    }),
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
