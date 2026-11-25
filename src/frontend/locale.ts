import { type Mode, type Say, MODES, baseKey } from '../shared';
import { KO, type Key } from './ko';
import { EN } from './en';
import { lang, t, tOr } from './lang';

const ROLES = [
  'interpreter',
  'conductor',
  'researcher',
  'coder',
  'writer',
  'reviewer',
  'proofreader',
  'tester',
  'images',
  'librarian',
];
// Each workflow's steps; a task given to one member alone is named by its role followed by solo's step
const FLOWS: Record<string, string[]> = {
  code: ['plan', 'plan_review', 'develop', 'review', 'test'],
  doc: ['write', 'review'],
  improve: ['structure'],
  research: ['research'],
  solo: ['work'],
  assign: ['assign'],
  judge: ['judge'],
};

type Dict = Record<Key, string>;
const pick = (dict: Dict, key: string) => dict[key as Key];
const byRole = (dict: Dict, kind: string) => Object.fromEntries(ROLES.map((r) => [r, pick(dict, `${kind}.${r}`)]));

// The names the window hands the main process, so 통역 and the record use the ones the screen shows
function namesIn(dict: Dict) {
  return {
    roles: byRole(dict, 'role'),
    nicknames: byRole(dict, 'nick'),
    workflows: Object.fromEntries(
      Object.entries(FLOWS).map(([flow, steps]) => [
        flow,
        {
          label: pick(dict, `flow.${flow}`),
          steps: Object.fromEntries(steps.map((s) => [s, pick(dict, `flow.${flow}.${s}`)])),
        },
      ]),
    ),
    modes: Object.fromEntries(MODES.map((m) => [m, pick(dict, `mode.${m}`)])),
  };
}
// The Korean names, which tests and scripts name members by
export const NAMES = namesIn(KO);
export const names = () => (lang() === 'en' ? namesIn(EN) : NAMES);

export const roleName = (key: unknown) => tOr(`role.${baseKey(String(key))}`);
// A model as the window names it everywhere: Sonnet, not sonnet
export const modelLabel = (m: string) => m[0].toUpperCase() + m.slice(1);
export const modeLabels = () => Object.fromEntries(MODES.map((m) => [m, t(`mode.${m}`)])) as Record<Mode, string>;
// An answer card's buttons; a pick-one card's options are task names and show as they are
export const answerLabel = (o: string) => (`answer.${o}` in KO ? t(`answer.${o}` as Key) : o);
export const providerName = (id: string) => ({
  label: tOr(`provider.${id}`),
  means: tOr(`provider.${id}.means`),
});

// What plays over a member's head in the camp
export const campScene = (scene: string) => tOr(`scene.${scene}`);
export const doing = (step: string) => (step === '?' ? step : t('camp.doing', { step }));

// A guard line's reason is a code when the user was asked, and the guard's own words when it refused outright
const reason = (r: unknown) => (typeof r === 'object' && r ? say(r as Say) : String(r));

// Each record line and reason, worded from its code; an unknown code shows as itself
export function say(s: Say): string {
  const a = s as unknown as Record<string, never>;
  const v = { ...(a as Record<string, string | number>) };
  const step = String(a.step ?? '');
  const role = roleName(a.role);
  const line = (key: Key, more: Record<string, string | number> = {}) => t(key, { ...v, role, step, ...more });
  switch (s.code) {
    case 'task.replan':
    case 'task.fail':
      return line(`say.${s.code}`, { why: say(a.why) });
    case 'step.incomplete':
      return line('say.step.incomplete', { missing: (a.missing as string[]).join(', ') });
    case 'step.done':
      return line('say.step.done', {
        state: t(a.verdict === 'rework' ? 'say.step.rework' : 'say.step.ok'),
        more: a.summary === step ? '' : ` — ${a.summary}`,
      });
    case 'guard.denied':
    case 'guard.auto':
    case 'guard.approved':
    case 'guard.refused':
      return line(`say.${s.code}`, { reason: reason(a.reason) });
    case 'card.approval':
      return line('say.card.approval', { reason: reason(a.reason), what: a.what ? `\n${a.what}` : '' });
    case 'confirm.deleteSession':
      return line('say.confirm.deleteSession', { session: `#${a.session}` });
    case 'confirm.hire':
      return line(a.hired ? 'say.confirm.rehire' : 'say.confirm.fire');
    case 'confirm.mode':
      return line('say.confirm.mode', { mode: modeLabels()[a.mode as Mode] ?? String(a.mode) });
    case 'chat.error':
      return line('say.chat.error', { error: a.error ?? t('say.unknownError') });
    case 'perm.change': {
      const parts = (a.parts as { what: string; sign: string; name: string }[]).map((p) => {
        const [server, access] = p.name.split(':');
        const name = p.what === 'mcp' ? `${server}(${tOr(`say.access.${access}`)})` : p.name;
        return t('say.perm.part', { part: tOr(`say.part.${p.what}`), sign: p.sign, name });
      });
      const write = a.write as [string, string] | null;
      if (write) parts.push(t('say.perm.write', { from: write[0], to: write[1] }));
      return parts.join(', ') || t('say.perm.none');
    }
    case 'wf.noRole':
      return line('say.wf.noRole', { role: roleName(a.role) });
    case 'wf.schema':
    case 'account.other':
      return String(a.text);
    case 'request':
      return line('say.request', { from: roleName(a.from), to: roleName(a.to) });
    case 'write.wait':
      return line('say.write.wait', { tasks: `#${(a.tasks as number[]).join(', #')}` });
    case 'write.stale':
      return line('say.write.stale', { files: (a.files as string[]).join(', ') });
    default:
      return `say.${s.code}` in KO ? line(`say.${s.code}` as Key) : s.code;
  }
}
