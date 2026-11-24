import path from 'node:path';
import type { Files, Records } from './ports';
import { type Author, type Change, type Doc, type Memory, links } from '../domain/wiki';
import { baseKey } from '../../shared';

// The librarian keeps these two itself; no document may take their names
const INDEX = 'index';
const LOG = 'log';
// Characters no file name may hold, so a title always names one file
const UNSAFE = /[\\/:*?"<>|\n]/g;
const LOG_LINE = /^## \[(.+?)\] (create|edit|delete) \| (.+?) \| (.+?)(?: \| task #(\d+))?$/;

// The project wiki, one file per document under .crew/wiki, and each agent's memory, one file per agent under .crew/memory
export class Wiki {
  constructor(
    public records: Records,
    private files: Files,
  ) {}

  root(projectId: number) {
    return path.join(this.records.readProject(projectId).path, '.crew');
  }

  dir(projectId: number) {
    return path.join(this.root(projectId), 'wiki');
  }

  title(title: string) {
    return title.replace(UNSAFE, '-').trim();
  }

  file(projectId: number, title: string) {
    return path.join(this.dir(projectId), `${this.title(title)}.md`);
  }

  list(projectId: number): Doc[] {
    return this.files
      .listFiles(this.dir(projectId))
      .filter((f) => f.endsWith('.md'))
      .map((f) => f.slice(0, -3))
      .filter((t) => t !== INDEX && t !== LOG)
      .sort((a, b) => a.localeCompare(b))
      .map((title) => ({ title, body: this.files.readText(this.file(projectId, title)) }));
  }

  find(projectId: number, title: string): Doc | null {
    const t = this.title(title);
    if (!t || t === INDEX || t === LOG) return null;
    const body = this.files.readText(this.file(projectId, t));
    return body ? { title: t, body } : null;
  }

  // Each change is logged and the index rebuilt from every document's first line, so neither drifts from the documents
  write(projectId: number, title: string, body: string, by: Author) {
    const t = this.title(title);
    if (!t || t === INDEX || t === LOG) throw new Error(`"${title}" cannot be a document title`);
    const old = this.find(projectId, t);
    this.files.writeText(this.file(projectId, t), `${body.trim()}\n`);
    this.note(projectId, old ? 'edit' : 'create', t, by);
  }

  remove(projectId: number, title: string, by: Author) {
    const doc = this.find(projectId, title);
    if (!doc) throw new Error(`The wiki has no document "${title}".`);
    this.files.remove(this.file(projectId, doc.title));
    this.note(projectId, 'delete', doc.title, by);
  }

  note(projectId: number, kind: Change['kind'], title: string, by: Author) {
    const log = this.files.readText(this.file(projectId, LOG)) || '# Log\n';
    const task = by.taskId ? ` | task #${by.taskId}` : '';
    this.files.writeText(
      this.file(projectId, LOG),
      `${log.trimEnd()}\n\n## [${new Date().toISOString()}] ${kind} | ${title} | ${by.name}${task}\n`,
    );
    const docs = this.list(projectId);
    this.files.writeText(
      this.file(projectId, INDEX),
      ['# Index', '', ...docs.map((d) => `- [[${d.title}]]: ${firstLine(d.body)}`)].join('\n') + '\n',
    );
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
        ...docs.map((d) => ({ title: d.title, missing: false })),
        ...missing.map((title) => ({ title, missing: true })),
      ],
      edges,
    };
  }

  // The log, newest first
  timeline(projectId: number): Change[] {
    return this.files
      .readText(this.file(projectId, LOG))
      .split('\n')
      .flatMap((line) => {
        const m = line.match(LOG_LINE);
        return m
          ? [{ at: m[1], kind: m[2] as Change['kind'], title: m[3], author: m[4], taskId: m[5] ? Number(m[5]) : null }]
          : [];
      })
      .reverse();
  }

  // Ready before anyone writes, so both folders are there to look in from the start
  prepare(projectId: number) {
    this.files.ensureDir(path.join(this.root(projectId), 'memory'));
    this.files.ensureDir(this.dir(projectId));
  }

  // A copy shares its original's file, since what it learns is its original's to keep
  memoryFile(projectId: number, key: string) {
    return path.join(this.root(projectId), 'memory', `${baseKey(key)}.md`);
  }

  // The whole memory is written at once, so a line that no longer holds is fixed instead of piling up
  remember(projectId: number, memberId: number, text: string) {
    const { key } = this.records.readMemberById(memberId);
    this.files.writeText(this.memoryFile(projectId, key), text.trim() ? `${text.trim()}\n` : '');
  }

  memories(projectId: number, memberId?: number): Memory[] {
    const keys = memberId
      ? [this.records.readMemberById(memberId).key]
      : this.records.listMembers(projectId).map((m) => m.key);
    return [...new Set(keys.map(baseKey))]
      .map((key) => ({ key, text: this.files.readText(this.memoryFile(projectId, key)).trim() }))
      .filter((m) => m.text);
  }

  // What a run starts with: the member's own memory and the titles of this project's wiki; it reads what it needs
  context(projectId: number, memberId: number) {
    const [own] = this.memories(projectId, memberId);
    const docs = this.list(projectId);
    return [
      '# Your memory in this project',
      own?.text ?? '(none yet)',
      '# Project wiki index',
      docs.length
        ? docs.map((d) => `- ${d.title}: ${firstLine(d.body).slice(0, 120)}`).join('\n')
        : '(no documents yet)',
      'Read a document with wiki_read when your work needs it; the librarian keeps the wiki. Keep your memory as the crew rules say with remember.',
    ].join('\n\n');
  }
}

const firstLine = (body: string) => body.split('\n')[0];
