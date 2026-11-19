import { expect, test } from 'vitest';
import { next } from '../scripts/version.mjs';

test('the version rises by 0.0.1 and each place rolls over after 9', () => {
  expect(next('0.0.0')).toBe('0.0.1');
  expect(next('0.0.9')).toBe('0.1.0');
  expect(next('0.9.9')).toBe('1.0.0');
});
