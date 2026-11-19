import fs from 'node:fs';
import path from 'node:path';
import type { SDKMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import type { QueryFn, Sdk } from './agent';

// One scripted answer: optionally a guarded tool call, a file write, or an app tool call first
type Turn = {
  text?: string;
  structured?: unknown;
  tool?: { name: string; input: Record<string, unknown> };
  write?: { file: string; text: string };
  call?: { name: string; input: Record<string, unknown> };
};

// Stands in for Claude when AI_CREW_SCRIPT names a script, so the window's flows can be tested without a model
export function scriptSdk(file: string): Sdk {
  const script = JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, Turn[]>;
  const tools = new Map<string, (a: Record<string, unknown>) => Promise<unknown>>();
  const query: QueryFn = ({ prompt, options }) => {
    const role = String(options?.systemPrompt).match(/You are the crew's \*\*(.+?)\*\*/)?.[1] ?? '?';
    async function* run(): AsyncGenerator<SDKMessage> {
      for await (const _ of prompt as AsyncIterable<SDKUserMessage>) {
        const turn = script[role]?.shift();
        if (!turn) throw new Error(`no scripted turn left for ${role}`);
        if (turn.tool) await options!.canUseTool!(turn.tool.name, turn.tool.input, { signal: new AbortController().signal, toolUseID: 'script' } as never);
        if (turn.write) fs.writeFileSync(path.join(options!.cwd!, turn.write.file), turn.write.text);
        if (turn.call) await tools.get(turn.call.name)!(turn.call.input);
        const text = turn.text ?? '';
        yield { type: 'system', subtype: 'init', session_id: `script-${role}`, model: options!.model } as never;
        yield { type: 'stream_event', parent_tool_use_id: null, event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } } } as never;
        yield {
          type: 'result',
          subtype: 'success',
          result: text,
          structured_output: turn.structured,
          num_turns: 1,
          total_cost_usd: 0,
          modelUsage: {},
        } as never;
      }
    }
    return Object.assign(run(), { interrupt: async () => undefined }) as unknown as ReturnType<QueryFn>;
  };
  return {
    query,
    tool: ((name: string, _d: string, _s: unknown, handler: (a: Record<string, unknown>) => Promise<unknown>) => {
      tools.set(name, handler);
      return { name };
    }) as unknown as Sdk['tool'],
    createSdkMcpServer: ((o: { name: string }) => ({ type: 'sdk', name: o.name })) as unknown as Sdk['createSdkMcpServer'],
  };
}
