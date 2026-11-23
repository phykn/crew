import { expect, test } from 'vitest';
import { writeTargets } from '../../src/backend/domain/policy';

test('write targets are read from redirects, tee, cp, sed -i, and PowerShell, not from quoted text', () => {
  expect(writeTargets('echo "a > b" > out.txt 2>&1')).toEqual(['out.txt']);
  expect(writeTargets('cat x | tee log.txt; cp a.txt dist/a.txt')).toEqual(['log.txt', 'dist/a.txt']);
  expect(writeTargets("sed -i 's/a/b/' file.js")).toEqual(['file.js']);
  expect(writeTargets('Set-Content -Path notes.md -Value hi')).toEqual(['notes.md']);
  expect(writeTargets('x=$(python cli.py 2>/dev/null)')).toEqual(['/dev/null']);
});
