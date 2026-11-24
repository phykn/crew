import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { EN } from '../../src/frontend/en';
import { KO, type Key } from '../../src/frontend/ko';

const dir = path.join(__dirname, '../../src/frontend');
const files = (d: string): string[] =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? files(p) : /\.(tsx?|js)$/.test(e.name) ? [p] : [];
  });

test('screens hold keys only: every Korean word lives in ko.ts', () => {
  // korean.ts reads particles, and the gallery is a page for the parts, never shown to users
  const allowed = ['ko.ts', 'korean.ts', 'Gallery.tsx'];
  const left = files(dir)
    .filter((f) => !allowed.includes(path.basename(f)))
    .flatMap((f) =>
      fs
        .readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .map((l) => l.replace(/\/\/.*$/, ''))
        .flatMap((l, i) => (/[가-힣]/.test(l) ? [`${path.relative(dir, f)}:${i + 1}: ${l.trim()}`] : [])),
    );
  expect(left).toEqual([]);
});

test('each English line fills in the same values as its Korean one', () => {
  const slots = (s: string) => [...new Set([...s.matchAll(/\{(\w+)/g)].map((m) => m[1]))].sort();
  const off = (Object.keys(KO) as Key[]).filter((k) => slots(KO[k]).join() !== slots(EN[k]).join());
  expect(off).toEqual([]);
});
