import { useEffect, useState } from 'react';
import type { Config } from '../../backend/crew/shipped';
import { call, onChanged } from '../api';
import { stamp } from '../time';
import { Choice } from './Choice';
import { KitIcon } from './Icons';

type Data = Awaited<ReturnType<typeof call<'members.permissions'>>>;

const TOOL_LABELS: Record<string, string> = {
  read: '읽기',
  search: '검색',
  write: '쓰기',
  edit: '편집',
  shell: '셸',
  web: '웹',
};
const WRITE = [
  { value: 'project', label: '프로젝트 폴더' },
  { value: 'output', label: '자기 산출물 폴더' },
  { value: 'none', label: '없음' },
];
const ACCESS = [
  { value: 'none', label: '없음' },
  { value: 'read', label: '읽기만' },
  { value: 'all', label: '전체' },
];

// One member's tools, write scope, skills, and MCP access; each change saves at once and applies to the next tool call
export function Permissions({ memberId }: { memberId: number }) {
  const [data, setData] = useState<Data | null>(null);
  // Only the skills a member holds show until the full list is asked for
  const [allSkills, setAllSkills] = useState(false);
  const load = () => call('members.permissions', { id: memberId }).then(setData);
  useEffect(() => {
    load();
    setAllSkills(false);
    // A reset or 도구's change elsewhere shows here too
    return onChanged((topic) => topic === 'members' && load());
  }, [memberId]);
  if (!data) return null;
  const { settings, kit } = data;

  async function save(config: Config) {
    await call('members.setPermissions', { id: memberId, config });
    await load();
  }
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  const skills = Object.entries(kit.skills).filter(([name]) => allSkills || settings.skills.includes(name));

  return (
    <section className="permissions" aria-label="권한">
      <span className="perm-label">도구</span>
      <div className="perm-items">
        {Object.entries(TOOL_LABELS).map(([kind, label]) => (
          <label key={kind} className="chip">
            <input
              className="sr-only"
              type="checkbox"
              checked={settings.tools.includes(kind as never)}
              onChange={() => save({ tools: toggle(settings.tools, kind as never) })}
            />
            {label}
          </label>
        ))}
      </div>
      <span className="perm-label">쓰기</span>
      <div className="perm-items">
        <Choice
          label="쓰기 범위"
          value={settings.write}
          options={WRITE}
          onChange={(v) => save({ write: v as Config['write'] })}
        />
      </div>
      <span className="perm-label">스킬</span>
      <div className="perm-items">
        {skills.map(([name, item]) => (
          <label key={name} className="chip" title={item.use}>
            <input
              className="sr-only"
              type="checkbox"
              checked={settings.skills.includes(name)}
              onChange={() => save({ skills: toggle(settings.skills, name) })}
            />
            <KitIcon icon={item.icon} label={item.label} />
            {item.label}
          </label>
        ))}
        <button className="chip more" onClick={() => setAllSkills(!allSkills)}>
          {allSkills ? '접기' : '+ 스킬'}
        </button>
      </div>
      <span className="perm-label">MCP</span>
      <div className="perm-items">
        {Object.entries(kit.mcp).map(([server, item]) => {
          const held = settings.mcp.find((m) => m.server === server);
          return (
            <span key={server} className="chip" title={item.use}>
              <KitIcon icon={item.icon} label={item.label} />
              {item.label}
              <Choice
                label={`${item.label} 접근`}
                className="small"
                value={held?.access ?? 'none'}
                options={ACCESS}
                onChange={(v) => {
                  const rest = settings.mcp.filter((m) => m.server !== server);
                  save({ mcp: v === 'none' ? rest : [...rest, { server, access: v as 'all' | 'read' }] });
                }}
              />
            </span>
          );
        })}
      </div>
      {data.changes.length > 0 && (
        <ul className="perm-changes" aria-label="권한 변경 기록">
          {data.changes.map((c, i) => (
            <li key={i}>
              <time>{stamp(c.at)}</time> {c.change}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
