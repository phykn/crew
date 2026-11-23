import type {
  CanUseTool,
  McpServerConfig,
  ModelUsage,
  Options,
  Query,
  SDKMessage,
  SDKUserMessage,
} from '@anthropic-ai/claude-agent-sdk';
import type { Image } from '../../../shared';
import type { Agent, AgentInput, AgentRun } from '../../app/ports';
import type { RunOutput } from '../../domain/records';
import type { Account } from '../../domain/providers';

export type QueryFn = (params: { prompt: AsyncIterable<SDKUserMessage>; options: Options }) => Query;
// The parts of the SDK the app uses; tests hand in stand-ins with the same shape
export type Sdk = {
  query: QueryFn;
  tool: typeof import('@anthropic-ai/claude-agent-sdk').tool;
  createSdkMcpServer: typeof import('@anthropic-ai/claude-agent-sdk').createSdkMcpServer;
};

type Usage = RunOutput['usage'];

// Messages for a running agent: the first prompt, then anything said to it while it works
export class Inbox implements AsyncIterable<SDKUserMessage> {
  queue: { text: string; images: Image[] }[] = [];
  // Every line taken in; the SDK may read ahead, so the queue alone cannot say how many are still to be answered
  taken = 0;
  wake: (() => void) | null = null;
  closed = false;

  // A closed inbox is never read again, so a line pushed then would be lost
  push(text: string, images: Image[] = []) {
    if (this.closed) return false;
    this.taken++;
    this.queue.push({ text, images });
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
        const { text, images } = this.queue.shift()!;
        yield {
          type: 'user',
          message: { role: 'user', content: content(text, images) },
          parent_tool_use_id: null,
        } as SDKUserMessage;
      }
      if (this.closed) return;
      await new Promise<void>((r) => (this.wake = r));
      this.wake = null;
    }
  }
}

// Plain text alone, or the pictures then the words; an empty text block is refused, so a picture may go alone
function content(text: string, images: Image[]) {
  if (!images.length) return text;
  return [
    ...images.map((i) => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: i.mediaType, data: i.data },
    })),
    ...(text ? [{ type: 'text' as const, text }] : []),
  ];
}

// Runs agents through the Claude Agent SDK, loaded on the first run
// How long a connection check waits for the service before calling it unreachable
const CHECK_MS = 20_000;

export class ClaudeAgent implements Agent {
  constructor(
    private sdk: () => Promise<Sdk>,
    private key: () => string | null,
  ) {}

  start(input: AgentInput) {
    return new ClaudeRun(this.sdk, input, envWith(this.key()));
  }

  async check(key: string | null): Promise<Account> {
    try {
      return await within(CHECK_MS, key ? checkKey(key) : this.checkLogin());
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // A session that is never given a prompt is enough for Claude Code to say whose login it runs on, and costs nothing
  async checkLogin(): Promise<Account> {
    const { query } = await this.sdk();
    const q = query({ prompt: silence(), options: { settingSources: [], env: envWith(null) } });
    try {
      const info = await q.accountInfo();
      const who = info.email ?? info.organization ?? '';
      if (!who && (!info.tokenSource || info.tokenSource === 'none'))
        return { ok: false, error: '이 컴퓨터에 Claude Code 로그인이 없습니다' };
      return { ok: true, who, plan: info.subscriptionType };
    } finally {
      q.close();
    }
  }
}

// Claude Code prefers a key in its environment to the login, so a run on the subscription drops any key it inherited
export function envWith(key: string | null) {
  const env = { ...process.env } as Record<string, string>;
  delete env.ANTHROPIC_API_KEY;
  if (key) env.ANTHROPIC_API_KEY = key;
  return env;
}

// Listing the models is the cheapest call that proves a key: it spends no tokens
async function checkKey(key: string): Promise<Account> {
  const res = await fetch('https://api.anthropic.com/v1/models?limit=1', {
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
  });
  if (res.ok) return { ok: true, who: '' };
  return { ok: false, error: res.status === 401 ? '키가 맞지 않습니다' : `Anthropic이 ${res.status}로 답했습니다` };
}

// A prompt that never comes, so the session starts and waits without asking the model anything
function silence(): AsyncIterable<SDKUserMessage> {
  return { [Symbol.asyncIterator]: () => ({ next: () => new Promise<never>(() => {}) }) };
}

function within<T>(ms: number, work: Promise<T>) {
  return Promise.race([
    work,
    new Promise<never>((_, fail) => setTimeout(() => fail(new Error('응답이 없습니다')), ms)),
  ]);
}

// One agent's turn, from the first prompt to its result; the inbox may grow while it runs
export class ClaudeRun implements AgentRun {
  inbox = new Inbox();
  query: Query | null = null;
  stopped = false;
  // The Claude session this run is on, known from the start when resumed and from init otherwise
  claudeId: string | null;

  constructor(
    private sdk: () => Promise<Sdk>,
    public input: AgentInput,
    private env?: Record<string, string>,
  ) {
    this.claudeId = input.fork ? null : (input.resume ?? null);
  }

  get model() {
    return this.input.model;
  }

  async run(prompt: string, images: Image[] = []): Promise<RunOutput> {
    const { input } = this;
    this.inbox.push(prompt, images);
    let out: RunOutput = { claudeId: input.resume ?? null, text: '', status: 'failed', usage: emptyUsage() };
    try {
      const { query } = await this.sdk();
      if (this.stopped) return { ...out, claudeId: this.claudeId, status: 'stopped' };
      this.query = query({
        prompt: this.inbox,
        options: {
          cwd: input.cwd,
          env: this.env,
          model: input.model,
          resume: input.resume ?? undefined,
          forkSession: input.fork,
          systemPrompt: input.system,
          // No tool is pre-allowed and the mode asks, so every call that is not read-only reaches the guard
          canUseTool: input.canUseTool as CanUseTool,
          permissionMode: 'default',
          mcpServers: input.mcpServers as Record<string, McpServerConfig>,
          mcpServersDelivery: 'initialize',
          // The project's own CLAUDE.md and settings apply; the user's personal ones do not leak into the crew
          settingSources: ['project'],
          includePartialMessages: true,
          outputFormat: input.schema ? { type: 'json_schema', schema: input.schema } : undefined,
        },
      });
      let answered = 0;
      for await (const msg of this.query) {
        out = this.read(msg, out);
        if (msg.type === 'result') answered++;
        if (msg.type === 'result' && msg.subtype === 'success' && out.status === 'done')
          this.input.onReply?.(msg.result, this.inbox.taken > answered);
        // The inbox stays open while the agent works, so more can be said to it; a result with nothing queued ends the run
        if (msg.type === 'result' && this.inbox.queue.length === 0) this.inbox.close();
      }
    } catch (err) {
      out = { ...out, status: 'failed', error: String(err) };
    }
    // A stop makes the SDK throw an abort error; it says nothing the stopped status does not
    if (this.stopped) out = { ...out, status: 'stopped', error: undefined };
    return out;
  }

  read(msg: SDKMessage, out: RunOutput): RunOutput {
    if (msg.type === 'system' && msg.subtype === 'init') {
      this.claudeId = msg.session_id;
      return { ...out, claudeId: msg.session_id };
    }
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
    if (msg.subtype === 'success')
      return { ...out, text: msg.result, status: 'done', usage, structured: msg.structured_output };
    return { ...out, status: 'failed', usage, error: msg.errors.join('\n') || msg.subtype };
  }

  say(text: string, images: Image[] = []) {
    return this.inbox.push(text, images);
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
