// Each commit raises the version by 0.0.1, each place rolling over after 9 (0.0.9 -> 0.1.0), and leaves one bundle of the repo in out/
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function next(version) {
  let [major, minor, patch] = version.split('.').map(Number);
  patch += 1;
  if (patch > 9) [patch, minor] = [0, minor + 1];
  if (minor > 9) [minor, major] = [0, major + 1];
  return `${major}.${minor}.${patch}`;
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf-8'));
const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'inherit' });

// Only the version lines change, so the files keep their own formatting and line endings
function setVersion(f, version, count) {
  let left = count;
  const file = path.join(root, f);
  const text = fs
    .readFileSync(file, 'utf-8')
    .replace(/("version": ")[^"]*(")/g, (m, a, b) => (left-- > 0 ? a + version + b : m));
  fs.writeFileSync(file, text);
}

// pre-commit: the new version goes into the commit being made
function bump() {
  const version = next(read('package.json').version);
  setVersion('package.json', version, 1);
  // The lock file names the project's version at the top and again under packages[""]
  setVersion('package-lock.json', version, 2);
  git('add', 'package.json', 'package-lock.json');
}

// post-commit: only the bundle of the newest commit is kept
function bundle() {
  const out = path.join(root, 'out');
  fs.mkdirSync(out, { recursive: true });
  for (const f of fs.readdirSync(out)) if (/^ai-crew-.*\.bundle$/.test(f)) fs.rmSync(path.join(out, f));
  const file = path.join(out, `ai-crew-${read('package.json').version.replaceAll('.', '-')}.bundle`);
  git('bundle', 'create', file, '--all');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ({ bump, bundle })[process.argv[2]]?.();
}
