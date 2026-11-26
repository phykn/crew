import { useEffect, useState } from 'react';
import type { Config } from '../../backend/domain/crew';
import { call, follow } from '../api';
import { stamp } from '../time';
import { Choice } from '../ui/Choice';
import { Chip, ChipButton, ToggleChip } from '../ui/Chip';
import { KIT } from '../crew';
import { KitIcon } from './Icons';
import { say } from '../locale';
import { type Key, t } from '../lang';

type Data = Awaited<ReturnType<typeof call<'members.permissions'>>>;

const TOOL_LABELS: Record<string, Key> = {
  read: 'tool.read',
  search: 'tool.search',
  write: 'tool.write',
  edit: 'tool.edit',
  shell: 'tool.shell',
  web: 'tool.web',
};
const WRITE: { value: string; label: Key }[] = [
  { value: 'project', label: 'scope.project' },
  { value: 'output', label: 'scope.output' },
  { value: 'none', label: 'perm.none' },
];
const ACCESS: { value: string; label: Key }[] = [
  { value: 'none', label: 'perm.none' },
  { value: 'read', label: 'perm.read' },
  { value: 'all', label: 'perm.all' },
];

// One member's tools, write scope, skills, and MCP access; each change saves at once and applies to the next tool call
export function Permissions({ memberId }: { memberId: number }) {
  const [data, setData] = useState<Data | null>(null);
  // Only the skills a member holds show until the full list is asked for
  const [allSkills, setAllSkills] = useState(false);
  useEffect(() => {
    setAllSkills(false);
    // A reset or a change from another window shows here too
    return follow(
      () => call('members.permissions', { id: memberId }),
      setData,
      (topic) => topic === 'members',
    );
  }, [memberId]);
  if (!data) return null;
  const { settings, kit } = data;

  // The change comes back through the members feed, which follow reads
  const save = (config: Config) => call('members.setPermissions', { id: memberId, config });
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  const skills = kit.skills
    .filter((name) => allSkills || settings.skills.includes(name))
    .map((name) => [name, KIT[name]] as const);

  return (
    <section className="permissions" aria-label={t('perm.label')}>
      <span className="perm-label">{t('perm.tools')}</span>
      <div className="perm-items">
        {Object.entries(TOOL_LABELS).map(([kind, label]) => (
          <ToggleChip
            key={kind}
            checked={settings.tools.includes(kind as never)}
            onChange={() => save({ tools: toggle(settings.tools, kind as never) })}
          >
            {t(label)}
          </ToggleChip>
        ))}
      </div>
      <span className="perm-label">{t('perm.writes')}</span>
      <div className="perm-items">
        <Choice
          label={t('perm.scope')}
          value={settings.write}
          options={WRITE.map((o) => ({ ...o, label: t(o.label) }))}
          onChange={(v) => save({ write: v as Config['write'] })}
        />
      </div>
      <span className="perm-label">{t('perm.skills')}</span>
      <div className="perm-items">
        {skills.map(([name, item]) => (
          <ToggleChip
            key={name}
            title={t(item.use)}
            checked={settings.skills.includes(name)}
            onChange={() => save({ skills: toggle(settings.skills, name) })}
          >
            <KitIcon icon={item.icon} label={t(item.label)} />
            {t(item.label)}
          </ToggleChip>
        ))}
        <ChipButton onClick={() => setAllSkills(!allSkills)}>{allSkills ? t('perm.less') : t('perm.more')}</ChipButton>
      </div>
      <span className="perm-label">MCP</span>
      <div className="perm-items">
        {kit.mcp.map((server) => {
          const item = KIT[server];
          const held = settings.mcp.find((m) => m.server === server);
          return (
            <Chip key={server} title={t(item.use)}>
              <KitIcon icon={item.icon} label={t(item.label)} />
              {t(item.label)}
              <Choice
                label={t('perm.access', { label: t(item.label) })}
                size="sm"
                value={held?.access ?? 'none'}
                options={ACCESS.map((o) => ({ ...o, label: t(o.label) }))}
                onChange={(v) => {
                  const rest = settings.mcp.filter((m) => m.server !== server);
                  save({ mcp: v === 'none' ? rest : [...rest, { server, access: v as 'all' | 'read' }] });
                }}
              />
            </Chip>
          );
        })}
      </div>
      {data.changes.length > 0 && (
        <ul className="perm-changes" aria-label={t('perm.changes')}>
          {data.changes.map((c, i) => (
            <li key={i}>
              <time>{stamp(c.at)}</time> {say(c.say)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
