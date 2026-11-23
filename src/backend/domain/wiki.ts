export type Doc = {
  id: number;
  projectId: number;
  title: string;
  body: string;
  workflowKind: string | null;
  workflowVersion: number | null;
  updatedAt: string;
};
export type Change = {
  id: number;
  docId: number;
  kind: 'create' | 'edit' | 'delete';
  title: string;
  author: string;
  taskId: number | null;
  files: string[];
  at: string;
};
export type Memory = {
  id: number;
  memberId: number;
  text: string;
  taskId: number | null;
  sessionId: number | null;
  at: string;
};
// Who wrote: a member (by id, so a renamed member keeps its record) or the user
export type Author = { memberId: number | null; name: string; taskId?: number | null; files?: string[] };

// The titles a body points to with [[title]], each once
export function links(body: string) {
  return [...new Set([...body.matchAll(/\[\[([^\]\n]+)\]\]/g)].map((m) => m[1].trim()))];
}
