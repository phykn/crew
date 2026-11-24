import { diffLines } from 'diff';
import type { WikiRecords } from './ports';
import { type Author, links } from '../domain/wiki';

// The project wiki and each member's own memory, kept in the record and never in the project folder
export class Wiki {
  constructor(public records: WikiRecords) {}

  list(projectId: number) {
    return this.records.listDocs(projectId);
  }

  find(projectId: number, title: string) {
    return this.records.findDoc(projectId, title);
  }

  read(id: number) {
    return this.records.readDoc(id);
  }

  write(projectId: number, title: string, body: string, by: Author, link?: { kind: string; version: number }) {
    return this.records.writeDoc(projectId, title, body, by, link);
  }

  remove(id: number, by: Author) {
    this.records.removeDoc(id, by);
  }

  // Documents and the [[links]] between them; a title linked to with no document is a topic still to write
  graph(projectId: number) {
    const docs = this.list(projectId);
    const edges = docs.flatMap((d) =>
      links(d.body)
        .filter((t) => t !== d.title)
        .map((to) => ({ from: d.title, to })),
    );
    const missing = [...new Set(edges.map((e) => e.to))].filter((t) => !docs.some((d) => d.title === t));
    return {
      nodes: [
        ...docs.map((d) => ({ title: d.title, id: d.id as number | null })),
        ...missing.map((title) => ({ title, id: null })),
      ],
      edges,
    };
  }

  timeline(projectId: number) {
    return this.records.listChanges(projectId);
  }

  // A run's prompt lists the wiki as it began, so without this, members side by side would each write their own copy of a topic
  createdSince(projectId: number, since: string, author: string, files: string[]) {
    return this.timeline(projectId)
      .filter(
        (c) =>
          c.kind === 'create' &&
          c.at >= since &&
          c.author !== author &&
          (!files.length || !c.files.length || c.files.some((f) => files.includes(f))) &&
          this.find(projectId, c.title),
      )
      .map((c) => c.title);
  }

  // The lines a change added and removed, for the timeline's detail; another project's change is as missing as none
  change(id: number, projectId?: number) {
    const row = this.records.readChange(id);
    if (!row || (projectId !== undefined && row.projectId !== projectId)) throw new Error(`There is no change #${id}`);
    const parts = diffLines(row.before, row.after);
    const lines = (p: (typeof parts)[number]) => p.value.split('\n').filter(Boolean);
    return {
      added: parts.filter((p) => p.added).flatMap(lines),
      removed: parts.filter((p) => p.removed).flatMap(lines),
    };
  }

  remember(
    projectId: number,
    memberId: number,
    text: string,
    where: { taskId: number | null; sessionId: number | null },
  ) {
    this.records.addMemory(projectId, memberId, text, where);
  }

  memories(projectId: number, memberId?: number) {
    return this.records.listMemories(projectId, memberId);
  }

  // What a run starts with: the member's own memory and the titles of this project's wiki; it reads what it needs
  context(projectId: number, memberId: number) {
    const own = this.memories(projectId, memberId).slice(-20);
    const docs = this.list(projectId);
    return [
      '# Your memory in this project',
      own.length ? own.map((m) => `- ${m.text}`).join('\n') : '(none yet)',
      '# Project wiki index',
      docs.length
        ? docs.map((d) => `- ${d.title}: ${d.body.split('\n')[0].slice(0, 120)}`).join('\n')
        : '(no documents yet)',
      'Read a document with wiki_read when your work needs it. Keep the wiki as the crew rules say with wiki_write, and what only you need with remember.',
    ].join('\n\n');
  }
}
