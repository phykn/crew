import { useEffect, useState } from 'react';
import type { Config } from '../../main/crew';
import { call } from '../api';
import { KitIcon } from './Icons';

type Data = Awaited<ReturnType<typeof call<'members.permissions'>>>;

const TOOL_LABELS: Record<string, string> = { read: '읽기', search: '검색', write: '쓰기', edit: '편집', shell: '셸', web: '웹' };
const WRITE_LABELS: Record<string, string> = { project: '프로젝트 폴더', output: '자기 산출물 폴더', none: '없음' };

// One member's tools, write scope, skills, and MCP access; each change saves at once and applies to the next tool call
export function Permissions({ memberId, onChange }: { memberId: number; onChange: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const load = () => call('members.permissions', { id: memberId }).then(setData);
  useEffect(() => {
    load();
  }, [memberId]);
  if (!data) return null;
  const { settings, kit } = data;

  async function save(config: Config) {
    await call('members.setPermissions', { id: memberId, config });
    await load();
    onChange();
  }
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  return (
    <section className="permissions" aria-label="권한">
      <h3>권한</h3>
      <div className="perm-row">
        <span className="perm-label">도구</span>
        {Object.entries(TOOL_LABELS).map(([kind, label]) => (
          <label key={kind} className="chip">
            <input
              type="checkbox"
              checked={settings.tools.includes(kind as never)}
              onChange={() => save({ tools: toggle(settings.tools, kind as never) })}
            />
            {label}
          </label>
        ))}
      </div>
      <div className="perm-row">
        <span className="perm-label">쓰기</span>
        <select
          aria-label="쓰기 범위"
          value={settings.write}
          onChange={(e) => save({ write: e.target.value as Config['write'] })}
        >
          {Object.entries(WRITE_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="perm-row">
        <span className="perm-label">스킬</span>
        {Object.entries(kit.skills).map(([name, item]) => (
          <label key={name} className="chip" title={item.use}>
            <input type="checkbox" checked={settings.skills.includes(name)} onChange={() => save({ skills: toggle(settings.skills, name) })} />
            <KitIcon icon={item.icon} label={item.label} />
            {item.label}
          </label>
        ))}
      </div>
      <div className="perm-row">
        <span className="perm-label">MCP</span>
        {Object.entries(kit.mcp).map(([server, item]) => {
          const held = settings.mcp.find((m) => m.server === server);
          return (
            <label key={server} className="chip" title={item.use}>
              <KitIcon icon={item.icon} label={item.label} />
              {item.label}
              <select
                aria-label={`${item.label} 접근`}
                value={held?.access ?? 'none'}
                onChange={(e) => {
                  const rest = settings.mcp.filter((m) => m.server !== server);
                  const v = e.target.value;
                  save({ mcp: v === 'none' ? rest : [...rest, { server, access: v as 'all' | 'read' }] });
                }}
              >
                <option value="none">없음</option>
                <option value="read">읽기만</option>
                <option value="all">전체</option>
              </select>
            </label>
          );
        })}
      </div>
      {data.changes.length > 0 && (
        <ul className="perm-changes" aria-label="권한 변경 기록">
          {data.changes.map((c, i) => (
            <li key={i}>
              <time>{new Date(c.at).toLocaleString('ko-KR')}</time> {c.change}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
