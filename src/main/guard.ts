import path from 'node:path';
import type { CanUseTool } from '@anthropic-ai/claude-agent-sdk';
import type { Member, Store } from './db';
import { ALLOW, type Questions, REFUSE } from './questions';

// What one member may do right now; read fresh on every call so a revoked permission applies at once
export type Policy = {
  key: string;
  role: string;
  tools: string[];
  write: 'project' | 'output' | 'none';
  // Each MCP server the member holds; read access opens only the server's looking tools
  mcp: { server: string; readTools: string[] | null }[];
  project: string;
  output: string;
  // The app's own record and crew files: a member who could rewrite these could switch the guard off
  protected: string[];
};

export type Verdict = { kind: 'allow' } | { kind: 'deny'; reason: string } | { kind: 'ask'; reason: string };

// Tools that only read are fine for everyone; the rest must be in the member's own tool list
const READ_ONLY = ['Read', 'Glob', 'Grep', 'LS', 'TodoWrite', 'NotebookRead'];

// git options that may stand between git and its subcommand, such as -C . or --no-pager
const GIT = String.raw`\bgit(?:\s+(?:--no-pager|--paginate|-p|-P|--bare|--no-optional-locks|-C\s+\S+|-c\s+\S+|--(?:git-dir|work-tree|namespace)(?:=|\s+)\S+))*`;
const FORBIDDEN: [RegExp, string][] = [
  [new RegExp(`${GIT}\\s+(push|clean)\\b|${GIT}\\s+reset\\s+--hard\\b`, 'i'), 'pushing or throwing away git history needs the user'],
  [
    /\brm\s+(?:-[\w-]+\s+)*(?:-\w*r\w*|--recursive)\b|\b(?:Remove-Item|ri|del|erase)\b[^;&|\n]*\s-r\w*|\b(rmdir|rd|del|erase)\b[^;&|\n]*\s\/s\b|\brmtree\b/i,
    'deleting a folder tree needs the user',
  ],
  [/\bnpm\s+(i|install|add)\b[^;&|\n]*\s(-g\b|--global\b|--location(=|\s+)global\b)/i, 'a global install needs the user'],
  [/\bclaude(\.exe)?\s+mcp\s+(add|add-json|add-from-claude-desktop|remove)\b/i, 'MCP servers are brought in by 도구 with the user\'s approval'],
];
// Checkers leave the project as they found it
const CHECKER_FORBIDDEN: [RegExp, string][] = [
  [new RegExp(`${GIT}\\s+(stash|checkout|restore|switch|commit|apply|add|rm|mv)\\b`, 'i'), 'a checker never changes the project'],
];
// A pip install is safe only into a virtual environment named by its path
const VENV_PIP = /(?:[\w.-]*[\\/])?\.?venv[\\/](?:Scripts|bin)[\\/](?:python[\d.]*(?:\.exe)?\s+-m\s+pip|pip[\d.]*(?:\.exe)?)\s+install\b/gi;
const SILENT = ['/dev/null', 'nul', '$null'];

export function checkCall(policy: Policy, tool: string, input: Record<string, unknown>, cwd = policy.project): Verdict {
  if (tool.startsWith('mcp__')) return checkMcp(policy, tool, input, cwd);
  if (READ_ONLY.includes(tool)) return { kind: 'allow' };
  // Where a call would write is settled first: no approval can open a place the role may never write
  const scope =
    tool === 'Bash'
      ? checkShell(policy, String(input.command ?? ''), cwd)
      : ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(tool)
        ? checkWrite(policy, path.resolve(cwd, String(input.file_path ?? input.notebook_path ?? '')))
        : ({ kind: 'allow' } as Verdict);
  if (scope.kind === 'deny') return scope;
  if (!policy.tools.includes(tool)) return { kind: 'ask', reason: `${policy.role}에게 ${tool} 도구가 없습니다` };
  return scope;
}

function checkMcp(policy: Policy, tool: string, input: Record<string, unknown>, cwd: string): Verdict {
  // Code run by the MCP server itself would pass every check below
  if (tool.endsWith('_unsafe')) return { kind: 'deny', reason: `${tool} runs arbitrary code outside the guard` };
  const server = tool.split('__')[1];
  // The app's own in-process tools are how members report; everyone has them
  if (server === 'crew') return { kind: 'allow' };
  const held = policy.mcp.find((m) => m.server === server);
  if (!held) return { kind: 'ask', reason: `${policy.role}에게 ${server} MCP 서버가 없습니다` };
  const name = tool.split('__').slice(2).join('__');
  if (held.readTools && !held.readTools.includes(name)) {
    return { kind: 'ask', reason: `${policy.role}은 ${server}를 읽기로만 쓸 수 있어 ${name}을 쓰려면 승인이 필요합니다` };
  }
  const file = input.filename;
  return typeof file === 'string' ? checkWrite({ ...policy, write: 'output' }, path.resolve(cwd, file)) : { kind: 'allow' };
}

function checkShell(policy: Policy, cmd: string, cwd: string): Verdict {
  const pips = cmd.match(/\bpip[\d.]*(?:\.exe)?\s+install\b/gi)?.length ?? 0;
  if (pips > (cmd.match(VENV_PIP)?.length ?? 0)) return { kind: 'deny', reason: 'installing into the system Python needs the user' };
  const checker = policy.write !== 'project';
  for (const [pattern, reason] of [...FORBIDDEN, ...(checker ? CHECKER_FORBIDDEN : [])]) {
    if (pattern.test(cmd)) return { kind: 'deny', reason };
  }
  for (const target of writeTargets(cmd).filter((t) => !SILENT.includes(t.toLowerCase()))) {
    // A path the shell builds cannot be resolved here, so only a member who may write the project can use one
    if (/^[~$%`]/.test(target)) {
      if (checker) return { kind: 'deny', reason: `write the path out instead of ${target}` };
      continue;
    }
    const verdict = checkWrite(policy, resolveTarget(target, cwd));
    if (verdict.kind !== 'allow') return verdict;
  }
  return { kind: 'allow' };
}

function checkWrite(policy: Policy, file: string): Verdict {
  if (policy.protected.some((p) => inside(file, p))) {
    return { kind: 'deny', reason: `${file} keeps the app's record and crew working; only the user changes it` };
  }
  const allowed = [policy.output, ...(policy.write === 'project' ? [policy.project] : [])];
  if (policy.write === 'none' || !allowed.some((a) => inside(file, a))) {
    return { kind: 'deny', reason: `${file} is outside where ${policy.role} may write (${policy.write === 'none' ? 'nowhere' : allowed.join(', ')})` };
  }
  return { kind: 'allow' };
}

function inside(file: string, dir: string) {
  const rel = path.relative(path.resolve(dir), path.resolve(file));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function resolveTarget(target: string, cwd: string) {
  // Git Bash writes C:\x as /c/x
  return path.resolve(cwd, target.replace(/^\/([a-zA-Z])\//, '$1:/'));
}

// Where a shell command writes, as far as its text shows; a script it runs can still write anywhere
export function writeTargets(cmd: string): string[] {
  const { segments, targets } = splitShell(cmd);
  for (const seg of segments) {
    const words = readWords(seg);
    if (!words.length) continue;
    const name = words[0].toLowerCase().replace(/\.exe$/, '');
    const args = words.slice(1);
    const plain = args.filter((w) => !w.startsWith('-'));
    if (name === 'tee') targets.push(...plain);
    else if (name === 'sed' && args.some((w) => /^-[a-zA-Z]*i\S*$|^--in-place/.test(w))) {
      const scripts = args.flatMap((w, n) => (['-e', '-f'].includes(w) ? [args[n + 1]] : []));
      targets.push(...(scripts.length ? plain.filter((w) => !scripts.includes(w)) : plain.slice(1)));
    } else if (['cp', 'copy', 'cpi', 'mv', 'move', 'mi', 'touch', 'mkdir'].includes(name) && plain.length) {
      // A move changes both ends: the source disappears and the destination appears
      const moved = ['mv', 'move', 'mi'].includes(name) ? plain : [plain.at(-1)!];
      targets.push(...(['touch', 'mkdir'].includes(name) ? plain : moved));
    } else if (['copy-item', 'move-item'].includes(name)) {
      targets.push(readOption(args, ['-destination']) ?? plain[1] ?? '');
      if (name === 'move-item') targets.push(readOption(args, ['-path', '-literalpath']) ?? plain[0] ?? '');
    } else if (['new-item', 'ni', 'out-file', 'set-content', 'add-content'].includes(name)) {
      targets.push(readOption(args, ['-path', '-filepath', '-literalpath']) ?? plain[0] ?? '');
    }
  }
  return targets.filter(Boolean);
}

function splitShell(cmd: string) {
  // Heredoc bodies are text, not commands; quoted prose and 2>&1 must not look like writes
  cmd = cmd.replace(/(<<-?\s*(['"]?)(\w+)\2[^\n]*)\n[\s\S]*?\n\s*\3[ \t]*(?=\n|$)/g, '$1');
  const segments: string[] = [];
  const targets: string[] = [];
  let text = '';
  let quote: string | null = null;
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (quote) {
      text += c;
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
      text += c;
    } else if (c === '>') {
      i = readRedirect(cmd, i, targets) - 1;
      text = text.replace(/(^|\s)[\d&]$/, '$1') + ' ';
    } else if (';|\n'.includes(c) || (c === '&' && cmd[i - 1] !== '>' && cmd[i + 1] !== '>')) {
      segments.push(text);
      text = '';
    } else text += c;
  }
  segments.push(text);
  return { segments, targets };
}

function readRedirect(cmd: string, i: number, targets: string[]) {
  i += cmd[i + 1] === '>' ? 2 : 1;
  if (cmd[i] === '|') i++;
  if (cmd[i] === '&') {
    i++;
    while (/[\w-]/.test(cmd[i] ?? '')) i++;
    return i;
  }
  while (cmd[i] === ' ' || cmd[i] === '\t') i++;
  const quote = cmd[i] === '"' || cmd[i] === "'" ? cmd[i] : null;
  const start = i;
  if (quote) i++;
  while (i < cmd.length && (quote ? cmd[i] !== quote : !/[\s;&|<>]/.test(cmd[i]))) i++;
  targets.push(cmd.slice(start, i).replace(/^["']|["']$/g, ''));
  return i + (quote ? 1 : 0);
}

function readWords(segment: string) {
  return (segment.match(/"[^"]*"|'[^']*'|\S+/g) ?? []).map((w) => w.replace(/^["']|["']$/g, ''));
}

function readOption(args: string[], names: string[]) {
  const at = args.findIndex((w) => names.includes(w.toLowerCase()));
  return at >= 0 ? args[at + 1] : undefined;
}

// The project paths a call writes, or the whole project when the command's text does not say
export function projectWrites(policy: Policy, tool: string, input: Record<string, unknown>, cwd = policy.project): string[] {
  if (policy.write !== 'project' || READ_ONLY.includes(tool) || tool.startsWith('mcp__')) return [];
  const files =
    tool === 'Bash'
      ? writeTargets(String(input.command ?? '')).filter((t) => !SILENT.includes(t.toLowerCase()))
      : ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(tool)
        ? [String(input.file_path ?? input.notebook_path ?? '')]
        : [];
  if (tool === 'Bash' && (!files.length || files.some((t) => /^[~$%`]/.test(t)))) return [policy.project];
  return files.map((t) => resolveTarget(t, cwd)).filter((f) => inside(f, policy.project));
}

export type GuardHooks = {
  // An approval already given for this tool in this task
  granted: (tool: string) => boolean;
  // Asks the user through 비서's chat; resolves true when they allow it
  ask: (tool: string, input: Record<string, unknown>, reason: string) => Promise<boolean>;
  record: (kind: 'denied' | 'approved' | 'refused', text: string) => void;
  // Holds the write reservation for an allowed call; a reason comes back when the call must not go ahead yet
  reserve?: (tool: string, input: Record<string, unknown>) => Promise<string | null>;
};

export function makeCanUseTool(policy: () => Policy, hooks: GuardHooks): CanUseTool {
  const allow = async (tool: string, input: Record<string, unknown>) => {
    const late = await hooks.reserve?.(tool, input);
    return late ? ({ behavior: 'deny', message: late } as const) : ({ behavior: 'allow', updatedInput: input } as const);
  };
  return async (tool, input) => {
    const verdict = checkCall(policy(), tool, input);
    if (verdict.kind === 'allow') return allow(tool, input);
    if (verdict.kind === 'deny') {
      hooks.record('denied', `${tool} 거부: ${verdict.reason}`);
      return { behavior: 'deny', message: refused(verdict.reason) };
    }
    if (hooks.granted(tool)) return allow(tool, input);
    const ok = await hooks.ask(tool, input, verdict.reason);
    hooks.record(ok ? 'approved' : 'refused', `${tool} ${ok ? '승인' : '거절'}: ${verdict.reason}`);
    // The permissions may have changed while the user was deciding; the approval answered the question as it was asked
    const now = checkCall(policy(), tool, input);
    if (ok && now.kind !== 'allow' && !(now.kind === 'ask' && now.reason === verdict.reason)) {
      return { behavior: 'deny', message: refused('permissions changed while waiting for approval') };
    }
    return ok ? allow(tool, input) : { behavior: 'deny', message: refused('the user did not allow it') };
  };
}

function refused(reason: string) {
  return `Blocked by the crew guard: ${reason}. Do not work around it; say what you needed and why when you hand back your work.`;
}

type GuardDeps = {
  store: Store;
  questions: Questions;
  policy: () => Policy;
  sessionId: number;
  taskId: number | null;
  member: Member;
  reserve?: GuardHooks['reserve'];
};

// One member's guard inside one task: denials go to the log, approvals are asked in 비서's chat and kept for the task
export function guardMember({ store, questions, policy, sessionId, taskId, member, reserve }: GuardDeps): CanUseTool {
  const record = (kind: string, text: string) =>
    store.addEvent({ sessionId, taskId, memberId: member.id, kind, text, detail: null });
  return makeCanUseTool(policy, {
    granted: (tool) => store.isGranted(sessionId, taskId, member.id, tool),
    ask: async (tool, input, reason) => {
      const what = String(input.command ?? input.file_path ?? input.url ?? '').slice(0, 300);
      const answer = await questions.ask({
        sessionId,
        taskId,
        kind: 'approval',
        prompt: `${policy().role}(${member.nickname})이 권한을 요청합니다. ${reason}.${what ? `\n${what}` : ''}`,
        options: [ALLOW, REFUSE],
        payload: { memberId: member.id, tool },
      });
      return answer === ALLOW;
    },
    record,
    reserve,
  });
}
