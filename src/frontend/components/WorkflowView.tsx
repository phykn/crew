import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BaseEdge,
  Controls,
  EdgeLabelRenderer,
  Handle,
  Position,
  applyNodeChanges,
  getBezierPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { CrewMember } from '../../backend/domain/crew';
import type { Project } from '../../backend/domain/records';
import type { Step } from '../../backend/domain/workflow';
import { call, onChanged } from '../api';
import { Button } from '../ui/Button';
import { Choice } from '../ui/Choice';
import { Confirm } from '../ui/Confirm';
import { Checkbox, Input, TextArea } from '../ui/Field';
import { Segmented } from '../ui/Segmented';
import { Toolbar, ToolbarEnd } from '../ui/Toolbar';
import { HIDE_MARK } from './WikiGraph';
import { josa } from '../../korean';

type Read = Awaited<ReturnType<typeof call<'workflows.read'>>>;
type StepNode = Node<{ step: Step; member?: CrewMember; back?: string }, 'step'>;
type LinkEdge = Edge<{ remove: () => void }, 'link'>;
type Layout = Record<string, { x: number; y: number }>;

// The workflow tab: this project's rules for one task kind, drawn as nodes and saved as a new version
export function WorkflowView({
  project,
  members,
  kind,
  onKind,
  active,
  onDirty,
}: {
  project: Project;
  members: CrewMember[];
  kind: string;
  onKind: (k: string) => void;
  active: boolean;
  onDirty: (dirty: boolean) => void;
}) {
  const [kinds, setKinds] = useState<{ kind: string; label: string }[]>([]);
  const [w, setW] = useState<Read | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [nodes, setNodes] = useState<StepNode[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  // Unsaved edits are marked, so leaving them behind is a known choice
  const [dirty, setDirty] = useState(false);
  useEffect(() => onDirty(dirty), [dirty]);
  // The kind picked while edits were unsaved, waiting for the user to let them go
  const [leaveFor, setLeaveFor] = useState<string | null>(null);
  const [flow, setFlow] = useState<ReactFlowInstance<StepNode, LinkEdge> | null>(null);
  const fitted = useRef(true);
  const canvas = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!flow || !canvas.current) return;
    // A canvas drawn anew, as when the tab opens again, starts fitted
    fitted.current = true;
    const watch = new ResizeObserver(() => fitted.current && fit(flow));
    watch.observe(canvas.current);
    return () => watch.disconnect();
  }, [flow]);

  useEffect(() => {
    call('workflows.kinds').then(setKinds);
  }, []);
  // The project and kind last asked for; a reply for an earlier pick is dropped
  const asked = useRef('');
  async function load() {
    const key = `${project.id}/${kind}`;
    asked.current = key;
    const read = await call('workflows.read', { projectId: project.id, kind });
    if (asked.current !== key) return;
    setW(read);
    setSteps(read.rules.steps);
    setNodes(toNodes(read.rules.steps, (read.layout ?? {}) as Layout));
    setPicked(null);
    setDirty(false);
    fitted.current = true;
  }
  useEffect(() => {
    load();
    setNote(null);
  }, [project.id, kind]);
  // A version 통역 saves shows at once; unsaved edits stay, and saving them is refused as stale
  useEffect(() => onChanged((topic) => topic === 'workflows' && !dirty && load()), [project.id, kind, dirty]);

  // Nodes carry the step, so edits in the side panel show on the canvas at once
  const shown = useMemo(
    () =>
      nodes.flatMap((n) => {
        const step = steps.find((s) => s.id === n.id);
        if (!step) return [];
        const member = members.find((m) => m.key === step.role);
        const back = steps.find((s) => s.id === reworkOf(n.id, steps))?.label;
        return [{ ...n, data: { step, member, back } }];
      }),
    [nodes, steps, members],
  );
  const [link, setLink] = useState<string | null>(null);
  const label = (id: string) => steps.find((s) => s.id === id)?.label ?? id;
  const unlink = (from: string, to: string) =>
    edit(to, { after: steps.find((s) => s.id === to)!.after.filter((a) => a !== from) });
  const edges: LinkEdge[] = steps.flatMap((s) =>
    s.after.map((a) => ({
      id: `${a}->${s.id}`,
      source: a,
      target: s.id,
      type: 'link',
      selected: link === `${a}->${s.id}`,
      ariaLabel: `${label(a)} → ${s.label}`,
      data: { remove: () => unlink(a, s.id) },
    })),
  );
  const edit = (id: string, change: Partial<Step>) => {
    setDirty(true);
    setSteps((all) => all.map((s) => (s.id === id ? { ...s, ...change } : s)));
  };

  function onConnect(c: Connection) {
    if (c.source && c.target && c.source !== c.target)
      edit(c.target, { after: [...new Set([...steps.find((s) => s.id === c.target)!.after, c.source])] });
  }
  function onEdgesChange(changes: EdgeChange[]) {
    for (const ch of changes) {
      if (ch.type === 'remove') unlink(...(ch.id.split('->') as [string, string]));
      if (ch.type === 'select') setLink(ch.selected ? ch.id : null);
    }
  }
  function onNodesChange(changes: NodeChange<StepNode>[]) {
    if (changes.some((ch) => ch.type === 'remove' || (ch.type === 'position' && ch.dragging))) setDirty(true);
    const gone = changes.flatMap((ch) => (ch.type === 'remove' ? [ch.id] : []));
    if (gone.length)
      setSteps((all) =>
        all
          .filter((s) => !gone.includes(s.id))
          .map((s) => ({
            ...s,
            after: s.after.filter((a) => !gone.includes(a)),
            rework: gone.includes(s.rework ?? '') ? undefined : s.rework,
          })),
      );
    setNodes((ns) => applyNodeChanges(changes, ns));
  }
  // Lays every node out again by order, for when hand-placed nodes have got tangled
  function tidy() {
    const auto = arrange(steps, Object.fromEntries(flow?.getNodes().map((n) => [n.id, n.measured?.height ?? 0]) ?? []));
    fitted.current = true;
    setNodes((ns) => ns.map((n) => ({ ...n, position: auto[n.id] ?? n.position })));
    setDirty(true);
    requestAnimationFrame(() => flow && fit(flow));
  }
  function addStep() {
    const id = nextId(steps);
    setDirty(true);
    const role = members.find((m) => m.status === 'hired' && !m.kept)?.key ?? members[0].key;
    setSteps((all) => [
      ...all,
      { id, role, label: '새 단계', does: '', after: [], verdict: false, loops: 3, requires: [] },
    ]);
    setNodes((ns) => [
      ...ns,
      { id, type: 'step', position: { x: 40, y: 40 + ns.length * 20 }, data: { step: null as never } },
    ]);
    setPicked(id);
  }
  async function save() {
    const layout = Object.fromEntries(
      nodes.map((n) => [n.id, { x: Math.round(n.position.x), y: Math.round(n.position.y) }]),
    );
    // A check sends rework to the nearest making step it follows, so the links alone decide it
    const rules = {
      ...w!.rules,
      steps: steps.map((s) => ({ ...s, rework: s.verdict ? reworkOf(s.id, steps) : undefined })),
    };
    const r = await call('workflows.save', { projectId: project.id, kind, base: w!.version, rules, layout });
    if (r.ok) {
      setNote({ ok: true, text: `버전 ${r.version} 저장, 새 업무부터 적용` });
      setDirty(false);
      const read = await call('workflows.read', { projectId: project.id, kind });
      setW(read);
    } else setNote({ ok: false, text: r.problems.join(' / ') });
  }

  const step = steps.find((s) => s.id === picked);
  // The side panel takes room from the canvas when it opens or closes, so the flow is fitted again
  useEffect(() => {
    requestAnimationFrame(() => flow && fit(flow));
  }, [!!step]);
  return (
    <section className="workflow-view" aria-label="워크플로우 편집">
      <Toolbar>
        <Segmented
          label="업무 종류"
          value={kind}
          options={kinds.map((k) => ({ value: k.kind, label: k.label }))}
          onChange={(k) => (dirty && k !== kind ? setLeaveFor(k) : onKind(k))}
        />
        <ToolbarEnd>
          <Button onClick={tidy}>정렬</Button>
          <Button onClick={addStep}>단계 추가</Button>
          <Button
            variant="primary"
            dirty={dirty}
            title={dirty ? '저장 안 한 변경이 있습니다' : `버전 ${w?.version ?? 0}`}
            onClick={save}
          >
            저장
          </Button>
        </ToolbarEnd>
      </Toolbar>
      {leaveFor && (
        <Confirm
          label="저장 안 한 변경"
          text="저장 안 한 변경이 사라집니다. 다른 업무 종류로 바꿀까요?"
          actions={[
            {
              label: '바꾸기',
              danger: true,
              run: () => {
                onKind(leaveFor);
                setLeaveFor(null);
              },
            },
          ]}
          onCancel={() => setLeaveFor(null)}
        />
      )}
      {note && (
        <p className={`workflow-note${note.ok ? '' : ' bad'}`} role="status">
          {note.text}
        </p>
      )}
      <div className="workflow-body">
        <div className="workflow-canvas" ref={canvas}>
          {/* A hidden canvas has no size to fit nodes to, so it is drawn only while the tab shows; the steps stay in state */}
          {active && (
            <ReactFlow
              nodes={shown}
              edges={edges}
              nodeTypes={NODE_TYPES}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, n) => setPicked(n.id)}
              onPaneClick={() => setPicked(null)}
              edgeTypes={EDGE_TYPES}
              colorMode="light"
              proOptions={HIDE_MARK}
              fitView
              onInit={setFlow}
              onMoveStart={(e) => {
                if (e) fitted.current = false;
              }}
              fitViewOptions={FIT}
              deleteKeyCode={['Backspace', 'Delete']}
            >
              <Background />
              <Controls showInteractive={false} orientation="horizontal" position="top-right" />
            </ReactFlow>
          )}
        </div>
        {step && (
          <aside className="workflow-side" aria-label="단계 설정">
            <label className="side-field">
              이름
              <Input
                size="md"
                aria-label="단계 이름"
                value={step.label}
                onChange={(e) => edit(step.id, { label: e.target.value })}
              />
            </label>
            <label className="side-field">
              담당
              <Choice
                label="담당 역할"
                wide
                value={step.role}
                options={members
                  .filter((m) => m.status === 'hired')
                  .map((m) => ({ value: m.key, label: `${m.role} ${m.nickname}` }))}
                onChange={(role) => edit(step.id, { role })}
              />
            </label>
            <label className="side-field">
              할 일
              <TextArea
                className="side-text"
                aria-label="할 일"
                value={step.does}
                onChange={(e) => edit(step.id, { does: e.target.value })}
              />
            </label>
            <Checkbox checked={step.verdict} onChange={(e) => edit(step.id, { verdict: e.target.checked })}>
              통과 못 하면 되돌려 보내기
            </Checkbox>
            {step.verdict && (
              <label className="side-field">
                최대 횟수
                <Input
                  size="md"
                  type="number"
                  aria-label="최대 횟수"
                  min={1}
                  max={9}
                  value={step.loops}
                  onChange={(e) => edit(step.id, { loops: Math.min(9, Math.max(1, Number(e.target.value) || 1)) })}
                />
              </label>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}

function StepBox({ data }: NodeProps<StepNode>) {
  const { step, member, back } = data;
  return (
    <div className="workflow-node" aria-label={`단계 ${step.label}`}>
      <Handle type="target" position={Position.Top} />
      {/* The role shows only when the step's name does not already say it */}
      {!step.label.startsWith(member?.role ?? step.role) && (
        <div className="workflow-role">{member?.role ?? step.role}</div>
      )}
      <div>{step.label}</div>
      {step.verdict && (
        <div className="muted">
          {back ? `안 되면 ${josa(back, '으로')} ${step.loops}번까지` : '앞 단계에 이어 주세요'}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
const NODE_TYPES = { step: StepBox };
// Fits the whole flow but never enlarges past real size, nor shrinks a node's words past reading
const FIT = { maxZoom: 1, minZoom: 0.7, padding: 0.15 };

// A flow too big to fit readably starts from its first row, so the work reads from the top and the rest is a pan away
async function fit(flow: ReactFlowInstance<StepNode, LinkEdge>) {
  await flow.fitView(FIT);
  const { x, zoom } = flow.getViewport();
  if (zoom > FIT.minZoom) return;
  const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sp-4'));
  const top = Math.min(...flow.getNodes().map((n) => n.position.y));
  await flow.setViewport({ x, y: gap - top * zoom, zoom });
}

// A picked link shows its own remove button, so nothing else on the screen is needed to cut one
function LinkLine({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<LinkEdge>) {
  const [line, x, y] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  return (
    <>
      <BaseEdge id={id} path={line} />
      {selected && (
        <EdgeLabelRenderer>
          <Button
            variant="primary"
            tone="danger"
            size="sm"
            iconOnly
            className="workflow-unlink nodrag nopan"
            style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
            aria-label="연결 끊기"
            onClick={data?.remove}
          >
            ×
          </Button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
const EDGE_TYPES = { link: LinkLine };

// The nearest step before this one that makes something rather than checks it
function reworkOf(id: string, steps: Step[]): string | undefined {
  const queue = [...(steps.find((s) => s.id === id)?.after ?? [])];
  for (const seen = new Set<string>(); queue.length; ) {
    const at = queue.shift()!;
    if (seen.has(at)) continue;
    seen.add(at);
    const s = steps.find((x) => x.id === at);
    if (s && !s.verdict) return at;
    queue.push(...(s?.after ?? []));
  }
}

// Saved positions where there are some; the canvas fills in each node's step from the steps in state
function toNodes(steps: Step[], layout: Layout): StepNode[] {
  const auto = arrange(steps);
  return steps.map((s) => ({ id: s.id, type: 'step', position: layout[s.id] ?? auto[s.id], data: { step: s } }));
}

// Rows by how many steps come before, each row centered, since the panel is tall and narrow; a row starts below the tallest node above it
function arrange(steps: Step[], heights: Record<string, number> = {}): Layout {
  const token = (name: string) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  const [width, gap, rowGap, least] = [token('--w-node'), token('--sp-4'), token('--sp-8'), token('--h-node')];
  const depth = (id: string, seen: string[] = []): number => {
    const s = steps.find((x) => x.id === id);
    const before = (s?.after ?? []).filter((a) => !seen.includes(a));
    return before.length ? 1 + Math.max(...before.map((a) => depth(a, [...seen, id]))) : 0;
  };
  const rows: Record<number, string[]> = {};
  for (const s of steps) (rows[depth(s.id)] ??= []).push(s.id);
  const out: Layout = {};
  let y = 0;
  for (const d of Object.keys(rows)
    .map(Number)
    .sort((a, b) => a - b)) {
    rows[d].forEach((id, i) => (out[id] = { x: (i - (rows[d].length - 1) / 2) * (width + gap), y }));
    y += Math.max(...rows[d].map((id) => Math.max(heights[id] ?? 0, least))) + rowGap;
  }
  return out;
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
