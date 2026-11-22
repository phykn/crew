import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';

const dir = path.join(__dirname, '../../src/frontend');
const read = (f: string) => fs.readFileSync(path.join(dir, f), 'utf8');
// The parts' own sheets sit beside them in ui/
const sheets = [
  'styles.css',
  ...fs.readdirSync(path.join(dir, 'ui')).flatMap((f) => (f.endsWith('.css') ? [`ui/${f}`] : [])),
];
const css = [...sheets, 'tokens.css'].map(read).join('\n');

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

test('styles use role tokens only: no palette color, hex, rgba, or pixel number outside tokens.css', () => {
  const tokens = fs.readFileSync(path.join(dir, 'tokens.css'), 'utf8');
  const palette = [
    ...tokens.slice(tokens.indexOf('---- Palette'), tokens.indexOf('---- Roles')).matchAll(/^\s+--([\w-]+):/gm),
  ].map((m) => m[1]);
  expect(palette.length).toBeGreaterThan(20);
  const styles = sheets
    .map(read)
    .join('\n')
    // Comments may name sizes, and media queries cannot read tokens
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@media[^{]*/g, '');
  const bad = [
    ...palette.filter((name) => styles.includes(`var(--${name})`)),
    ...(styles.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|\b(?!0px)\d+px\b/g) ?? []),
  ];
  expect(bad).toEqual([]);
  // A role points at the palette, never at a raw value, so a color changes in one place
  const roles = tokens.slice(tokens.indexOf('---- Roles'));
  expect(roles.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g) ?? []).toEqual([]);
});

test('screens draw controls only through ui/: no raw button, input, or textarea, and no restyling of a part', () => {
  const screens = [
    'App.tsx',
    'Gallery.tsx',
    ...fs.readdirSync(path.join(dir, 'components')).map((f) => `components/${f}`),
  ].filter((f) => f.endsWith('.tsx'));
  const raw = screens.flatMap((f) =>
    [...read(f).matchAll(/<(button|input|textarea|select)\b|@radix-ui\/react-(dialog|switch)|['"` ]ui-[\w-]+/g)].map(
      (m) => `${f}: ${m[0]}`,
    ),
  );
  expect(raw).toEqual([]);
  expect(read('styles.css').match(/\.ui-[\w-]+/g) ?? []).toEqual([]);
});

test('sizes come in few steps: five font sizes, three corners, and three control heights', () => {
  const tokens = read('tokens.css');
  const names = (re: RegExp) => [...tokens.matchAll(re)].map((m) => m[1]);
  expect(names(/^\s+--(fs-[\w-]+):/gm)).toEqual(['fs-xs', 'fs-sm', 'fs-md', 'fs-lg', 'fs-xl']);
  expect(names(/^\s+--(r(?:-[\w-]+)?):/gm)).toEqual(['r-sm', 'r', 'r-lg']);
  const heights = sheets
    .filter((f) => f.startsWith('ui/'))
    .flatMap((f) => [...read(f).matchAll(/^\s+height: (var\(--h-[\w-]+\))/gm)].map((m) => m[1]));
  expect(new Set(heights)).toEqual(new Set(['var(--h-sm)', 'var(--h-md)', 'var(--h-lg)']));
});
