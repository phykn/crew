import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  applyNodeChanges,
  applyEdgeChanges,
  type Edge,
  type Node,
  type NodeProps,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { CrewMember } from '../../main/crew';
import type { Project } from '../../main/db';
import type { Step } from '../../main/workflow';
import { call } from '../api';

type Read = Awaited<ReturnType<typeof call<'workflows.read'>>>;
type StepNode = Node<{ step: Step; member?: CrewMember }, 'step'>;
type Layout = Record<string, { x: number; y: number }>;

// The workflow tab: this project's rules for one task kind, drawn as nodes and saved as a new version
export function WorkflowView({ project, members, kind, onKind, active }: { project: Project; members: CrewMember[]; kind: string; onKind: (k: string) => void; active: boolean }) {
  const [kinds, setKinds] = useState<{ kind: string; label: string }[]>([]);
  const [w, setW] = useState<Read | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [nodes, setNodes] = useState<StepNode[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  // Unsaved edits are marked, so leaving them behind is a known choice
  const [dirty, setDirty] = useState(false);
  // The tab stays mounted while hidden, where fitting has no size to fit to; it fits when first shown after a load
  const flow = useRef<{ fitView: () => unknown } | null>(null);
  const fitted = useRef(false);

  useEffect(() => {
    call('workflows.kinds').then(setKinds);
  }, []);
  async function load() {
    const read = await call('workflows.read', { projectId: project.id, kind });
    setW(read);
    setSteps(read.rules.steps);
    setNodes(toNodes(read.rules.steps, (read.layout ?? {}) as Layout, members));
    setPicked(null);
    setDirty(false);
    fitted.current = false;
  }
  useEffect(() => {
    load();
    setNote(null);
  }, [project.id, kind]);

  useEffect(() => {
    if (!active || fitted.current || !flow.current || !nodes.length) return;
    fitted.current = true;
    requestAnimationFrame(() => flow.current?.fitView());
  }, [active, nodes]);

  // Nodes carry the step, so edits in the side panel show on the canvas at once
  const shown = useMemo(() => nodes.map((n) => ({ ...n, data: { step: steps.find((s) => s.id === n.id)!, member: members.find((m) => m.key === steps.find((s) => s.id === n.id)?.role) } })).filter((n) => n.data.step), [nodes, steps, members]);
  const edges: Edge[] = steps.flatMap((s) => s.after.map((a) => ({ id: `${a}->${s.id}`, source: a, target: s.id })));
  const edit = (id: string, change: Partial<Step>) => {
    setDirty(true);
    setSteps((all) => all.map((s) => (s.id === id ? { ...s, ...change } : s)));
  };

  function onConnect(c: Connection) {
    if (c.source && c.target && c.source !== c.target) edit(c.target, { after: [...new Set([...steps.find((s) => s.id === c.target)!.after, c.source])] });
  }
  function onEdgesChange(changes: EdgeChange[]) {
    for (const ch of changes) if (ch.type === 'remove') {
      const [from, to] = ch.id.split('->');
      edit(to, { after: steps.find((s) => s.id === to)!.after.filter((a) => a !== from) });
    }
    applyEdgeChanges(changes, edges);
  }
  function onNodesChange(changes: NodeChange<StepNode>[]) {
    if (changes.some((ch) => ch.type === 'remove' || (ch.type === 'position' && ch.dragging))) setDirty(true);
    const gone = changes.flatMap((ch) => (ch.type === 'remove' ? [ch.id] : []));
    if (gone.length) setSteps((all) => all.filter((s) => !gone.includes(s.id)).map((s) => ({ ...s, after: s.after.filter((a) => !gone.includes(a)), rework: gone.includes(s.rework ?? '') ? undefined : s.rework })));
    setNodes((ns) => applyNodeChanges(changes, ns));
  }
  function addStep() {
    const id = nextId(steps);
    setDirty(true);
    const role = members.find((m) => m.status === 'hired' && !m.kept)?.key ?? members[0].key;
    setSteps((all) => [...all, { id, role, label: '새 단계', does: '', after: [], verdict: false, requires: [] }]);
    setNodes((ns) => [...ns, { id, type: 'step', position: { x: 40, y: 40 + ns.length * 20 }, data: { step: null as never } }]);
    setPicked(id);
  }
  async function save() {
    const layout = Object.fromEntries(nodes.map((n) => [n.id, { x: Math.round(n.position.x), y: Math.round(n.position.y) }]));
    const rules = { ...w!.rules, steps };
    const r = await call('workflows.save', { projectId: project.id, kind, base: w!.version, rules, layout });
    if (r.ok) {
      setNote({ ok: true, text: `버전 ${r.version}로 저장했습니다. 다음 새 업무부터 적용됩니다.` });
      setDirty(false);
      const read = await call('workflows.read', { projectId: project.id, kind });
      setW(read);
    } else setNote({ ok: false, text: `저장하지 않았습니다: ${r.problems.join(' / ')}` });
  }

  const step = steps.find((s) => s.id === picked);
  return (
    <section className="workflow-view" aria-label="워크플로우 편집">
      <header className="workflow-head">
        <h2>
          {project.name} 워크플로우 <span className="muted">버전 {w?.version ?? 0}</span>
          {dirty && <span className="workflow-dirty">저장 안 한 변경 있음</span>}
        </h2>
        <div className="workflow-kinds" role="group" aria-label="업무 종류">
          {kinds.map((k) => (
            <button key={k.kind} aria-pressed={k.kind === kind} onClick={() => (!dirty || confirm('저장 안 한 변경이 사라집니다. 다른 업무 종류로 바꿀까요?')) && onKind(k.kind)}>
              {k.label}
            </button>
          ))}
        </div>
        <button className="button" onClick={addStep}>단계 추가</button>
        <button className="button primary" onClick={save}>저장</button>
      </header>
      {note && <p className={`workflow-note${note.ok ? '' : ' bad'}`} role="status">{note.text}</p>}
      <div className="workflow-body">
        <div className="workflow-canvas">
          <ReactFlow
            nodes={shown}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={(f) => (flow.current = { fitView: () => f.fitView() })}
            onNodeClick={(_, n) => setPicked(n.id)}
            onPaneClick={() => setPicked(null)}
            colorMode="light"
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        {step && (
          <aside className="workflow-side" aria-label="단계 설정">
            <label>
              이름
              <input aria-label="단계 이름" value={step.label} onChange={(e) => edit(step.id, { label: e.target.value })} />
            </label>
            <label>
              담당
              <select aria-label="담당 역할" value={step.role} onChange={(e) => edit(step.id, { role: e.target.value })}>
                {members.filter((m) => m.status === 'hired').map((m) => (
                  <option key={m.key} value={m.key}>{m.role} {m.nickname}</option>
                ))}
              </select>
            </label>
            <label>
              할 일
              <textarea aria-label="할 일" value={step.does} onChange={(e) => edit(step.id, { does: e.target.value })} />
            </label>
            <fieldset aria-label="선행 단계">
              <legend>선행 단계</legend>
              {steps.filter((s) => s.id !== step.id).map((s) => (
                <label key={s.id} className="check">
                  <input type="checkbox" checked={step.after.includes(s.id)} onChange={(e) => edit(step.id, { after: e.target.checked ? [...step.after, s.id] : step.after.filter((a) => a !== s.id) })} />
                  {s.label}
                </label>
              ))}
            </fieldset>
            <label className="check">
              <input type="checkbox" checked={step.verdict} onChange={(e) => edit(step.id, { verdict: e.target.checked })} />
              판정 단계 (통과 / 수정 요청)
            </label>
            {step.verdict && (
              <label>
                수정 요청 시 되돌릴 단계
                <select aria-label="되돌릴 단계" value={step.rework ?? ''} onChange={(e) => edit(step.id, { rework: e.target.value || undefined })}>
                  <option value="">고르세요</option>
                  {steps.filter((s) => s.id !== step.id).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
            )}
            <fieldset>
              <legend>인계에 꼭 있어야 할 것</legend>
              {(['files', 'checks'] as const).map((k) => (
                <label key={k} className="check">
                  <input type="checkbox" checked={step.requires.includes(k)} onChange={(e) => edit(step.id, { requires: e.target.checked ? [...step.requires, k] : step.requires.filter((r) => r !== k) })} />
                  {k === 'files' ? '변경 파일' : '실행한 검사'}
                </label>
              ))}
            </fieldset>
          </aside>
        )}
      </div>
    </section>
  );
}

function StepBox({ data }: NodeProps<StepNode>) {
  const { step, member } = data;
  return (
    <div className="workflow-node" style={{ borderColor: member?.color }} aria-label={`단계 ${step.label}`}>
      <Handle type="target" position={Position.Left} />
      <div className="workflow-role">{member?.role ?? step.role}</div>
      <div>{step.label}</div>
      {step.verdict && <div className="muted">판정</div>}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const NODE_TYPES = { step: StepBox };

// Saved positions where there are some; otherwise columns by how many steps come before
function toNodes(steps: Step[], layout: Layout, members: CrewMember[]): StepNode[] {
  const depth = (id: string, seen: string[] = []): number => {
    const s = steps.find((x) => x.id === id);
    const before = (s?.after ?? []).filter((a) => !seen.includes(a));
    return before.length ? 1 + Math.max(...before.map((a) => depth(a, [...seen, id]))) : 0;
  };
  const rows: Record<number, number> = {};
  return steps.map((s) => {
    const d = depth(s.id);
    const row = (rows[d] = (rows[d] ?? -1) + 1);
    return { id: s.id, type: 'step', position: layout[s.id] ?? { x: d * 190, y: row * 110 }, data: { step: s, member: members.find((m) => m.key === s.role) } };
  });
}

// Step ids are lowercase letters and underscores, so a new one is step_a, step_b, ...
function nextId(steps: Step[]) {
  for (let n = 0; ; n++) {
    let id = 'step_';
    for (let k = n; ; k = Math.floor(k / 26) - 1) {
      id += String.fromCharCode(97 + (k % 26));
      if (k < 26) break;
    }
    if (!steps.some((s) => s.id === id)) return id;
  }
}
