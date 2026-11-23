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
  // Milliseconds the turn takes, so a recording shows the crew at work instead of done at once
  wait?: number;
};

type ScriptTool = { name: string; handler: (a: Record<string, unknown>) => Promise<unknown> };

// Stands in for Claude when CREW_SCRIPT names a script, so the window's flows can be tested without a model
export function scriptSdk(file: string): Sdk {
  const script = JSON.parse(fs.readFileSync(file, 'utf-8')) as Record<string, Turn[]>;
  const query: QueryFn = ({ prompt, options }) => {
    // Each run's own tools, so two members at work at once never answer each other's calls
    const tools = new Map(
      Object.values(options?.mcpServers ?? {})
        .flatMap((s) => (s as unknown as { tools?: ScriptTool[] }).tools ?? [])
        .map((t) => [t.name, t.handler]),
    );
    const role = String(options?.systemPrompt).match(/You are the crew's \*\*(.+?)\*\*/)?.[1] ?? '?';
    // An interrupt ends a turn waiting on a card, as the real SDK does, so a stop can be tested
    let cut = () => {};
    const cutOff = new Promise<'cut'>((resolve) => (cut = () => resolve('cut')));
    async function* run(): AsyncGenerator<SDKMessage> {
      for await (const _ of prompt as AsyncIterable<SDKUserMessage>) {
        const turn = script[role]?.shift();
        if (!turn) throw new Error(`no scripted turn left for ${role}`);
        const result = turn.call
          ? ((await tools.get(turn.call.name)!(turn.call.input)) as { content: { text: string }[] })
          : null;
        // {{result}} in the text stands for what the app tool answered, as a model would quote it
        const text = (turn.text ?? '').replace('{{result}}', result?.content[0]?.text ?? '');
        yield { type: 'system', subtype: 'init', session_id: `script-${role}`, model: options!.model } as never;
        // The words stream before a guarded call waits, as a model says what it is about to do
        yield {
          type: 'stream_event',
          parent_tool_use_id: null,
          event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
        } as never;
        const asked =
          turn.tool &&
          options!.canUseTool!(turn.tool.name, turn.tool.input, {
            signal: new AbortController().signal,
            toolUseID: 'script',
          } as never);
        if (asked && (await Promise.race([asked, cutOff])) === 'cut') return;
        if (turn.wait && (await Promise.race([new Promise((r) => setTimeout(r, turn.wait)), cutOff])) === 'cut') return;
        if (turn.write) fs.writeFileSync(path.join(options!.cwd!, turn.write.file), turn.write.text);
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
    // A connection check reads the account and closes, as it does with the real SDK
    return Object.assign(run(), {
      interrupt: async () => cut(),
      accountInfo: async () => ({ email: 'script@crew.test', tokenSource: 'script' }),
      close: () => {},
    }) as unknown as ReturnType<QueryFn>;
  };
  return {
    query,
    tool: ((name: string, _d: string, _s: unknown, handler: ScriptTool['handler']) => ({
      name,
      handler,
    })) as unknown as Sdk['tool'],
    createSdkMcpServer: ((o: { name: string; tools?: ScriptTool[] }) => ({
      type: 'sdk',
      name: o.name,
      tools: o.tools,
    })) as unknown as Sdk['createSdkMcpServer'],
  };
}
