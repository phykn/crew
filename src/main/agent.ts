import type { CanUseTool, ModelUsage, Options, Query, SDKMessage, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';

export type QueryFn = (params: { prompt: AsyncIterable<SDKUserMessage>; options: Options }) => Query;
// The parts of the SDK the app uses; tests hand in stand-ins with the same shape
export type Sdk = {
  query: QueryFn;
  tool: typeof import('@anthropic-ai/claude-agent-sdk').tool;
  createSdkMcpServer: typeof import('@anthropic-ai/claude-agent-sdk').createSdkMcpServer;
};

// The error of a run refused because its member was let go while it waited
export const NOT_HIRED = 'not hired';

// What an in-process tool answers
export const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });

export type Usage = { turns: number; inputTokens: number; outputTokens: number; costUsd: number };

export type RunInput = {
  cwd: string;
  model: string;
  system: string;
  resume?: string | null;
  canUseTool: CanUseTool;
  mcpServers?: Options['mcpServers'];
  // A JSON schema the run's final answer must match; the match comes back as structured
  schema?: Record<string, unknown>;
  onText?: (delta: string) => void;
  // Called once per answered turn, so a message said mid-run gets its own reply
  onReply?: (text: string) => void;
};

export type RunOutput = {
  claudeId: string | null;
  text: string;
  status: 'done' | 'failed' | 'stopped' | 'limit';
  usage: Usage;
  structured?: unknown;
  error?: string;
};

// Messages for a running agent: the first prompt, then anything said to it while it works
export class Inbox implements AsyncIterable<SDKUserMessage> {
  queue: string[] = [];
  wake: (() => void) | null = null;
  closed = false;

  // A closed inbox is never read again, so a line pushed then would be lost
  push(text: string) {
    if (this.closed) return false;
    this.queue.push(text);
    this.wake?.();
    return true;
  }

  close() {
    this.closed = true;
    this.wake?.();
  }

  async *[Symbol.asyncIterator]() {
    while (true) {
      while (this.queue.length) {
        const text = this.queue.shift()!;
        yield { type: 'user', message: { role: 'user', content: text }, parent_tool_use_id: null } as SDKUserMessage;
      }
      if (this.closed) return;
      await new Promise<void>((r) => (this.wake = r));
      this.wake = null;
    }
  }
}

// One agent's turn, from the first prompt to its result; the inbox may grow while it runs
export class AgentRun {
  inbox = new Inbox();
  query: Query | null = null;
  stopped = false;

  constructor(
    public queryFn: QueryFn,
    public input: RunInput,
  ) {}

  async run(prompt: string): Promise<RunOutput> {
    const { input } = this;
    this.inbox.push(prompt);
    this.query = this.queryFn({
      prompt: this.inbox,
      options: {
        cwd: input.cwd,
        model: input.model,
        resume: input.resume ?? undefined,
        systemPrompt: input.system,
        // No tool is pre-allowed and the mode asks, so every call that is not read-only reaches the guard
        canUseTool: input.canUseTool,
        permissionMode: 'default',
        mcpServers: input.mcpServers,
        mcpServersDelivery: 'initialize',
        // The project's own CLAUDE.md and settings apply; the user's personal ones do not leak into the crew
        settingSources: ['project'],
        includePartialMessages: true,
        outputFormat: input.schema ? { type: 'json_schema', schema: input.schema } : undefined,
      },
    });
    let out: RunOutput = { claudeId: input.resume ?? null, text: '', status: 'failed', usage: emptyUsage() };
    try {
      for await (const msg of this.query) {
        out = this.read(msg, out);
        if (msg.type === 'result' && msg.subtype === 'success' && out.status === 'done') this.input.onReply?.(msg.result);
        // The inbox stays open while the agent works, so more can be said to it; a result with nothing queued ends the run
        if (msg.type === 'result' && this.inbox.queue.length === 0) this.inbox.close();
      }
    } catch (err) {
      out = { ...out, status: 'failed', error: String(err) };
    }
    if (this.stopped) out.status = 'stopped';
    return out;
  }

  read(msg: SDKMessage, out: RunOutput): RunOutput {
    if (msg.type === 'system' && msg.subtype === 'init') return { ...out, claudeId: msg.session_id };
    if (msg.type === 'stream_event') {
      const ev = msg.event;
      if (msg.parent_tool_use_id === null && ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
        this.input.onText?.(ev.delta.text);
      }
      return out;
    }
    if (msg.type === 'rate_limit_event' && msg.rate_limit_info.status === 'rejected') {
      return { ...out, status: 'limit', error: 'usage limit reached' };
    }
    if (msg.type !== 'result') return out;
    const usage = {
      turns: msg.num_turns,
      inputTokens: sumUsage(msg.modelUsage, 'inputTokens'),
      outputTokens: sumUsage(msg.modelUsage, 'outputTokens'),
      costUsd: msg.total_cost_usd,
    };
    if (out.status === 'limit') return { ...out, usage };
    if (msg.subtype === 'success') return { ...out, text: msg.result, status: 'done', usage, structured: msg.structured_output };
    return { ...out, status: 'failed', usage, error: msg.errors.join('\n') || msg.subtype };
  }

  say(text: string) {
    return this.inbox.push(text);
  }

  async stop() {
    this.stopped = true;
    this.inbox.close();
    await this.query?.interrupt();
  }
}

function emptyUsage(): Usage {
  return { turns: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
}

// The result of a run that never started
export function skipped(status: RunOutput['status'], error?: string): RunOutput {
  return { claudeId: null, text: '', status, usage: emptyUsage(), error };
}

function sumUsage(models: Record<string, ModelUsage>, key: 'inputTokens' | 'outputTokens') {
  // Cache reads and writes count as input: they are what the model read
  return Object.values(models).reduce((n, m) => {
    const extra = key === 'inputTokens' ? m.cacheReadInputTokens + m.cacheCreationInputTokens : 0;
    return n + m[key] + extra;
  }, 0);
}

// The SDK is an ES module kept out of the bundle so it can find its bundled Claude Code binary
export async function loadSdk(): Promise<Sdk> {
  const sdk = await import('@anthropic-ai/claude-agent-sdk');
  return { query: sdk.query as QueryFn, tool: sdk.tool, createSdkMcpServer: sdk.createSdkMcpServer };
}
