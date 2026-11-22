import { useMemo } from 'react';
import { ReactFlow, Background, Controls, Handle, Position, type Edge, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { call } from '../api';
import { Empty } from '../ui/Empty';

export type Graph = Awaited<ReturnType<typeof call<'wiki.graph'>>>;
type DocNode = Node<{ title: string; missing: boolean }, 'doc'>;

// The wiki as a graph: each document a dot, each [[link]] a line; a dashed dot is a topic linked to but not written
// The library's corner link is left out of a canvas the user works in
export const HIDE_MARK = { hideAttribution: true };

export function WikiGraph({ graph, onOpen }: { graph: Graph; onOpen: (title: string) => void }) {
  const nodes = useMemo<DocNode[]>(() => {
    const at = spread(
      graph.nodes.map((n) => n.title),
      graph.edges,
    );
    return graph.nodes.map((n) => ({
      id: n.title,
      type: 'doc',
      position: at[n.title],
      data: { title: n.title, missing: n.id === null },
    }));
  }, [graph]);
  const edges: Edge[] = graph.edges.map((e) => ({ id: `${e.from}->${e.to}`, source: e.from, target: e.to }));

  if (!graph.nodes.length) return <Empty>아직 문서가 없습니다</Empty>;
  return (
    <div className="wiki-graph" aria-label="위키 그래프">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodeClick={(_, n) => onOpen(n.id)}
        nodesConnectable={false}
        defaultEdgeOptions={{ type: 'straight' }}
        colorMode="light"
        proOptions={HIDE_MARK}
        fitView
        fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
      >
        <Background />
        <Controls showInteractive={false} orientation="horizontal" position="top-right" />
      </ReactFlow>
    </div>
  );
}

function DocDot({ data }: NodeProps<DocNode>) {
  return (
    <div className="wiki-dot" data-missing={data.missing || undefined} aria-label={`문서 ${data.title}`}>
      <Handle type="target" position={Position.Top} className="wiki-dot-end" />
      {data.title}
      <Handle type="source" position={Position.Top} className="wiki-dot-end" />
    </div>
  );
}
const NODE_TYPES = { doc: DocDot };

// A small force layout: linked documents pull together, every pair pushes apart, so clusters and loners show
function spread(ids: string[], edges: { from: string; to: string }[]) {
  const gap = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--w-node'));
  const at: Record<string, { x: number; y: number }> = {};
  // Start on a circle, so the result is the same every time it is drawn
  ids.forEach((id, i) => {
    const a = (2 * Math.PI * i) / ids.length;
    at[id] = { x: Math.cos(a) * gap * 2, y: Math.sin(a) * gap * 2 };
  });
  for (let step = 0; step < 200; step++) {
    const move: Record<string, { x: number; y: number }> = Object.fromEntries(ids.map((id) => [id, { x: 0, y: 0 }]));
    for (const a of ids)
      for (const b of ids) {
        if (a === b) continue;
        const dx = at[a].x - at[b].x;
        const dy = at[a].y - at[b].y;
        const d = Math.max(1, Math.hypot(dx, dy));
        const push = (gap * gap) / d;
        move[a].x += (dx / d) * push;
        move[a].y += (dy / d) * push;
      }
    for (const e of edges) {
      const dx = at[e.to].x - at[e.from].x;
      const dy = at[e.to].y - at[e.from].y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const pull = (d * d) / gap;
      move[e.from].x += (dx / d) * pull;
      move[e.from].y += (dy / d) * pull;
      move[e.to].x -= (dx / d) * pull;
      move[e.to].y -= (dy / d) * pull;
    }
    // A pull to the middle keeps documents with no links near the rest
    for (const id of ids) {
      const d = Math.max(1, Math.hypot(at[id].x, at[id].y));
      move[id].x -= (at[id].x / d) * ((d * d) / gap) * 0.4;
      move[id].y -= (at[id].y / d) * ((d * d) / gap) * 0.4;
    }
    // Each step moves less, so the layout settles instead of shaking
    const limit = gap * (1 - step / 200);
    for (const id of ids) {
      const d = Math.max(1, Math.hypot(move[id].x, move[id].y));
      at[id].x += (move[id].x / d) * Math.min(d, limit);
      at[id].y += (move[id].y / d) * Math.min(d, limit);
    }
  }
  return at;
}
