import { z } from 'zod';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Options, SDKMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import type { QueryFn, Sdk } from '../src/backend/agents/run';
import { Chat, type Emit, type Paths } from '../src/backend/chat';
import { Crew } from '../src/backend/crew/shipped';
import { Store } from '../src/backend/db';

export const CREW = new Crew(path.resolve(__dirname, '../crew'));

// A scratch record and project folder per test, so tests never touch real data
export function makeScratch(files: Record<string, string> = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crew-test-'));
  const project = path.join(dir, 'demo');
  fs.mkdirSync(project);
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(project, name), text);
  return {
    db: path.join(dir, 'crew.db'),
    project,
    paths: { output: path.join(dir, 'output'), protected: [path.join(dir, 'crew.db')] },
  };
}

export function openScratch(files?: Record<string, string>) {
  const scratch = makeScratch(files);
  return { ...scratch, store: new Store(scratch.db) };
}

// A chat on a scratch record with one project, its crew, and a session, its members answering from the scripts
export function openChat(
  scripts: Record<string, Turn[]> = {},
  o: { files?: Record<string, string>; emit?: Emit; crew?: Crew } = {},
) {
  const scratch = openScratch(o.files);
  const fake = fakeCrew(scripts);
  const chat = new Chat(scratch.store, async () => fake.sdk, o.crew ?? CREW, o.emit ?? (() => {}), scratch.paths);
  const p = scratch.store.addProject(scratch.project);
  chat.members.seed(p.id);
  return { ...scratch, fake, chat, p, s: scratch.store.createSession(p.id) };
}

// The same record opened again after a restart, as the app starts: work cut off is stopped for the user to resume
export function reopenChat(scratch: { db: string; paths: Paths }, scripts: Record<string, Turn[]> = {}) {
  const store = new Store(scratch.db);
  store.recoverInterrupted();
  const fake = fakeCrew(scripts);
  return {
    store,
    fake,
    chat: new Chat(
      store,
      async () => fake.sdk,
      CREW,
      () => {},
      scratch.paths,
    ),
  };
}

// A session's runs and agent sessions as the record holds them; the app itself reads them only as totals
export function recordedRuns(store: Store, sessionId: number) {
  return store.db
    .prepare(
      `SELECT r.model, r.status, r.cost_usd AS costUsd, r.error FROM runs r
       JOIN agent_sessions a ON a.id = r.agent_session_id WHERE a.session_id = ? ORDER BY r.id`,
    )
    .all(sessionId) as { model: string; status: string; costUsd: number; error: string | null }[];
}

export function recordedAgents(store: Store, sessionId: number) {
  return store.db
    .prepare(
      `SELECT m.key, a.claude_id AS claudeId FROM agent_sessions a
       JOIN members m ON m.id = a.member_id WHERE a.session_id = ? ORDER BY a.id`,
    )
    .all(sessionId) as { key: string; claudeId: string | null }[];
}

// A turn may hold its answer back, as a long real step does
export type Turn = (prompt: string, options: Options) => SDKMessage[] | Promise<SDKMessage[]>;

// A turn that never answers, for a member that should stay at work
export const never: Turn = () => new Promise(() => {});

// Stands in for the SDK with one script per role, picked by the role named in the system prompt
export function fakeCrew(scripts: Record<string, Turn[]>) {
  const calls: { role: string; prompt: string; options: Options }[] = [];
  const query: QueryFn = ({ prompt, options }) => {
    const role = String(options.systemPrompt).match(/You are the crew's \*\*(.+?)\*\*/)?.[1] ?? '?';
    // An interrupt ends the turn under way, as the real SDK does
    let cut = () => {};
    const cutOff = new Promise<SDKMessage[]>((resolve) => (cut = () => resolve([])));
    async function* run() {
      for await (const msg of prompt as AsyncIterable<SDKUserMessage>) {
        const { content } = msg.message;
        // A picture shows as its type, so a test can see it reached the run in order with the words
        const text =
          typeof content === 'string'
            ? content
            : content.map((b) => (b.type === 'text' ? b.text : `[${b.type}]`)).join('\n');
        calls.push({ role, prompt: text, options });
        const turn = scripts[role]?.shift();
        if (!turn) throw new Error(`no scripted turn left for ${role}`);
        yield* await Promise.race([turn(text, options), cutOff]);
      }
    }
    return Object.assign(run(), { interrupt: async () => cut() }) as unknown as ReturnType<QueryFn>;
  };
  // The app's own tools are kept by name so a scripted turn can call them as the model would
  const tools = new Map<string, (args: Record<string, unknown>) => Promise<unknown>>();
  const sdk = {
    query,
    tool: (
      name: string,
      _d: string,
      shape: z.ZodRawShape,
      handler: (a: Record<string, unknown>) => Promise<unknown>,
    ) => {
      tools.set(name, async (a) => handler(z.object(shape).parse(a)));
      return { name };
    },
    createSdkMcpServer: (o: { name: string }) => ({ type: 'sdk', name: o.name }),
  } as unknown as Sdk;
  return { calls, sdk, tools };
}

export function reply(text: string, sessionId = 'claude-1', structured?: unknown): Turn {
  return (_prompt, options) =>
    [
      { type: 'system', subtype: 'init', session_id: sessionId, model: options.model },
      {
        type: 'stream_event',
        parent_tool_use_id: null,
        event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
      },
      {
        type: 'result',
        subtype: 'success',
        result: text,
        structured_output: structured,
        num_turns: 1,
        total_cost_usd: 0.01,
        modelUsage: {
          [options.model!]: { inputTokens: 10, outputTokens: 5, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 },
        },
      },
    ] as unknown as SDKMessage[];
}

export function handback(sessionId: string, hb: Record<string, unknown>): Turn {
  return reply(String(hb.summary), sessionId, { body: '', points: [], files: [], checks: [], ...hb });
}

// The text of an in-process tool's answer
export async function toolText(fake: ReturnType<typeof fakeCrew>, name: string, args: Record<string, unknown>) {
  const out = (await fake.tools.get(name)!(args)) as { content: { text: string }[] };
  return out.content[0].text;
}
