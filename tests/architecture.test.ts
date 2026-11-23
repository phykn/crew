import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';

const backend = path.join(__dirname, '../src/backend');

// Every import of each file in a layer, type imports too, as where it points: a backend folder, src/, or a package
function imports(layer: string) {
  const dir = path.join(backend, layer);
  return (fs.readdirSync(dir, { recursive: true }) as string[])
    .filter((f) => f.endsWith('.ts'))
    .flatMap((f) => {
      const file = path.join(dir, f);
      const text = fs.readFileSync(file, 'utf8');
      return [...text.matchAll(/(?:from|import)\s+'([^']+)'/g)].map((m) => {
        const spec = m[1];
        if (!spec.startsWith('.')) return { file: `${layer}/${f}`, to: spec };
        const rel = path
          .relative(backend, path.resolve(path.dirname(file), spec))
          .split(path.sep)
          .join('/');
        return { file: `${layer}/${f}`, to: rel.startsWith('..') ? `src/${path.basename(rel)}` : rel.split('/')[0] };
      });
    });
}

const SHARED = ['src/shared', 'src/korean'];

test('domain is pure: it imports only itself, the shared kernel, and calculation libraries', () => {
  const allowed = ['domain', ...SHARED, 'zod', 'xstate', 'node:path'];
  expect(imports('domain').filter((i) => !allowed.includes(i.to))).toEqual([]);
});

test('app reaches the outside only through its ports: no adapter, disk, record, SDK, or window import', () => {
  const banned = [
    'adapters',
    'wire',
    'index',
    'node:fs',
    'node:sqlite',
    'node:child_process',
    'electron',
    '@anthropic-ai/claude-agent-sdk',
  ];
  expect(imports('app').filter((i) => banned.includes(i.to))).toEqual([]);
});
