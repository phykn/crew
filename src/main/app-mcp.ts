import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { type Sdk, text } from './agent';
import type { Chat } from './chat';
import type { Task } from './db';

// The app's own MCP server, in process: each tool does what the matching click in the window does
export function appServer(sdk: Sdk, chat: Chat, sessionId: number) {
  const { store } = chat;
  const projectId = store.projectOf(sessionId).id;
  // Only this project's tasks exist for the caller; any other id is answered as missing, with nothing opened
  const ownTask = (id: number) => {
    try {
      const task = store.readTask(id);
      return store.readSession(task.sessionId).projectId === projectId ? task : null;
    } catch {
      return null;
    }
  };
  const missing = (id: number) => text(`업무 #${id}는 이 프로젝트에 없습니다.`);
  const describe = (t: Task) => {
    const stop = store
      .listEvents(t.sessionId)
      .filter((e) => e.taskId === t.id && /실패|중단|멈/.test(e.text))
      .map((e) => e.text);
    return { id: t.id, title: t.title, status: t.status, stage: t.stage, updatedAt: t.updatedAt, stopReasons: stop };
  };
  const go = (view: Record<string, unknown>) => chat.emit('navigate', { sessionId, ...view });

  return sdk.createSdkMcpServer({
    name: 'app',
    tools: [
      sdk.tool('read_help', "Read the app's help: where things are and how they work.", {}, async () =>
        text(readHelp(chat.crew.dir)),
      ),
      sdk.tool(
        'find_tasks',
        "Find this project's tasks by words in their title, request, or log, newest first. When several fit, the user picks one on a card and only that one is returned.",
        { query: z.string().default(''), status: z.enum(['stopped', 'failed', 'done', 'running']).optional() },
        async (a) => {
          const words = a.query.split(/\s+/).filter(Boolean);
          const all = store
            .listSessions(projectId)
            .flatMap((s) => store.listTasks(s.id))
            .filter((t) => !a.status || t.status === a.status)
            .filter((t) => words.every((w) => `${t.title} ${t.request}`.includes(w)))
            .sort((x, y) => y.id - x.id);
          if (all.length <= 1) return text(JSON.stringify(all.map(describe)));
          const label = (t: Task) => `#${t.id} ${t.title} (${t.status})`;
          const choice = await chat.questions.ask({
            sessionId,
            taskId: null,
            kind: 'choice',
            prompt: '어느 업무를 말씀하시나요?',
            options: all.map(label),
            payload: {},
          });
          const picked = all.find((t) => label(t) === choice)!;
          return text(JSON.stringify([describe(picked)]));
        },
      ),
      sdk.tool('open_log', "Open a task's log in the window.", { task_id: z.number().int() }, async (a) => {
        const t = ownTask(a.task_id);
        if (!t) return missing(a.task_id);
        go({ view: 'log', taskId: t.id });
        return text(`업무 #${t.id}의 로그를 열었습니다.`);
      }),
      sdk.tool('open_wiki_history', "Open the project wiki's change timeline in the window.", {}, async () => {
        go({ view: 'wiki' });
        return text('위키 변경 타임라인을 열었습니다.');
      }),
      sdk.tool(
        'open_workflow_editor',
        "Open this project's workflow editor in the window.",
        { kind: z.string().default('code') },
        async (a) => {
          go({ view: 'workflow', kind: a.kind });
          return text(`${a.kind} 워크플로우 편집 화면을 열었습니다.`);
        },
      ),
      sdk.tool(
        'resume_task',
        'Resume a stopped or failed task in this project from its unfinished steps.',
        { task_id: z.number().int() },
        async (a) => {
          const t = ownTask(a.task_id);
          if (!t) return missing(a.task_id);
          return text(
            chat.tasks.resume(t.id)
              ? `업무 #${t.id}를 재개했습니다.`
              : `업무 #${t.id}는 ${t.status} 상태라 재개할 수 없습니다.`,
          );
        },
      ),
    ],
  });
}

export function readHelp(crewDir: string) {
  const dir = path.join(crewDir, 'help');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => fs.readFileSync(path.join(dir, f), 'utf-8'))
    .join('\n\n');
}
