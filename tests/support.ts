import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Options, SDKMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import type { QueryFn } from '../src/main/agent';
import { Crew } from '../src/main/crew';
import { Store } from '../src/main/db';

export const CREW = new Crew(path.resolve(__dirname, '../crew'));

// A scratch record and project folder per test, so tests never touch real data
export function makeScratch(files: Record<string, string> = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-crew-test-'));
  const project = path.join(dir, 'demo');
  fs.mkdirSync(project);
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(project, name), text);
  return { db: path.join(dir, 'crew.db'), project, paths: { output: path.join(dir, 'output'), protected: [path.join(dir, 'crew.db')] } };
}

export function openScratch(files?: Record<string, string>) {
  const scratch = makeScratch(files);
  return { ...scratch, store: new Store(scratch.db) };
}

export type Turn = (prompt: string, options: Options) => SDKMessage[];

// Stands in for the SDK: each prompt the agent receives is answered by the next scripted turn
export function fakeQuery(turns: Turn[]) {
  const calls: Options[] = [];
  const fn: QueryFn = ({ prompt, options }) => {
    calls.push(options);
    async function* run() {
      for await (const msg of prompt as AsyncIterable<SDKUserMessage>) {
        const turn = turns.shift();
        if (!turn) throw new Error('fake query ran out of turns');
        yield* turn(String(msg.message.content), options);
      }
    }
    const gen = run();
    return Object.assign(gen, { interrupt: async () => undefined }) as unknown as ReturnType<QueryFn>;
  };
  return { fn, calls };
}

export function reply(text: string, sessionId = 'claude-1'): Turn {
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
        num_turns: 1,
        total_cost_usd: 0.01,
        modelUsage: {
          [options.model!]: { inputTokens: 10, outputTokens: 5, cacheReadInputTokens: 0, cacheCreationInputTokens: 0 },
        },
      },
    ] as unknown as SDKMessage[];
}
