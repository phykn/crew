import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';

const dir = path.join(__dirname, '../../src/frontend');
const css = ['styles.css', 'tokens.css'].map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');

// Splits on commas and spaces that are not inside var(...) or rgba(...)
const split = (value: string, by: string) => {
  const parts: string[] = [];
  let depth = 0;
  let part = '';
  for (const c of value) {
    depth += c === '(' ? 1 : c === ')' ? -1 : 0;
    if (c === by && depth === 0) (parts.push(part.trim()), (part = ''));
    else part += c;
  }
  return [...parts, part.trim()].filter(Boolean);
};

test('every outline is even on all sides: a shadow with no blur may only be a ring, never an offset edge', () => {
  const values = [...css.matchAll(/(?:box-shadow|--shadow-[\w-]+)\s*:\s*([^;]+);/g)].map((m) => m[1]);
  expect(values.length).toBeGreaterThan(0);
  const solidOffsets = values.flatMap((v) =>
    split(v.replace(/\s+/g, ' '), ',').filter((shadow) => {
      const [x, y, blur = '0'] = split(shadow, ' ').filter((t) => t !== 'inset');
      // A lone token is another variable holding whole shadows, checked where it is defined
      return y !== undefined && (x !== '0' || y !== '0') && blur === '0';
    }),
  );
  expect(solidOffsets).toEqual([]);
});
