import { useEffect, useState } from 'react';
import type { CrewMember } from '../../main/crew';
import type { Project } from '../../main/db';
import { call, onChanged } from '../api';

type Read = Awaited<ReturnType<typeof call<'workflows.read'>>>;

// The workflow edit screen for one project, in the same window; closing it returns to where the user was
export function WorkflowView({ project, members, kind, onKind, onClose }: { project: Project; members: CrewMember[]; kind: string; onKind: (k: string) => void; onClose: () => void }) {
  const [kinds, setKinds] = useState<{ kind: string; label: string }[]>([]);
  const [w, setW] = useState<Read | null>(null);
  useEffect(() => {
    call('workflows.kinds').then(setKinds);
  }, []);
  useEffect(() => {
    const load = () => call('workflows.read', { projectId: project.id, kind }).then(setW);
    load();
    return onChanged((t) => t === 'workflows' && load());
  }, [project.id, kind]);

  // Columns by how many steps come before, so parallel steps stand side by side
  const depth = (id: string, seen: string[] = []): number => {
    const step = w!.rules.steps.find((s) => s.id === id)!;
    return step.after.length ? 1 + Math.max(...step.after.filter((a) => !seen.includes(a)).map((a) => depth(a, [...seen, id]))) : 0;
  };
  const columns = w ? [...new Set(w.rules.steps.map((s) => depth(s.id)))].sort().map((d) => w.rules.steps.filter((s) => depth(s.id) === d)) : [];
  const member = (key: string) => members.find((m) => m.key === key);

  return (
    <section className="workflow-view" aria-label="워크플로우 편집">
      <header className="workflow-head">
        <h2>
          {project.name} · 워크플로우 <span className="muted">버전 {w?.version ?? 0}</span>
        </h2>
        <div className="workflow-kinds" role="group" aria-label="업무 종류">
          {kinds.map((k) => (
            <button key={k.kind} aria-pressed={k.kind === kind} onClick={() => onKind(k.kind)}>
              {k.label}
            </button>
          ))}
        </div>
        <button className="button" onClick={onClose}>닫기</button>
      </header>
      <div className="workflow-canvas">
        {columns.map((col, i) => (
          <div className="workflow-column" key={i}>
            {col.map((s) => (
              <div className="workflow-node" key={s.id} style={{ borderColor: member(s.role)?.color }} aria-label={`단계 ${s.label}`}>
                <div className="workflow-role" style={{ color: member(s.role)?.color }}>{member(s.role)?.role ?? s.role}</div>
                <div>{s.label}</div>
                {s.verdict && <div className="muted">판정 · 되돌림 {w!.rules.steps.find((x) => x.id === s.rework)?.label}</div>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
