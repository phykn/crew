// One wiki document: its file's name without .md, and its text
export type Doc = { title: string; body: string };
// One line of the wiki's log
export type Change = {
  at: string;
  kind: 'create' | 'edit' | 'delete';
  title: string;
  author: string;
  taskId: number | null;
};
// One agent's memory: its whole file, by the agent's key
export type Memory = { key: string; text: string };
// Who wrote, by key or 'user', and in which task
export type Author = { name: string; taskId?: number | null };

// The titles a body points to with [[title]], each once
export function links(body: string) {
  return [...new Set([...body.matchAll(/\[\[([^\]\n]+)\]\]/g)].map((m) => m[1].trim()))];
}
