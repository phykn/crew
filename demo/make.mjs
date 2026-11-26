// Records the app, cuts the footage into the video's scenes, renders the video with HyperFrames, and turns it into the README's GIF
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const here = import.meta.dirname;
const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);

const project = path.join(here, 'video');
const clips = path.join(project, 'assets');
const footage = clips;
const gif = path.join(here, '..', 'assets', 'demo.gif');
const run = (cmd, args, cwd = here) => execFileSync(cmd, args, { cwd, stdio: 'inherit', shell: true });
// What the page needs from beside it: the app's own font and animation library, beside the clips it plays
const BESIDE = ['galmuri/dist/Galmuri11.woff2', 'galmuri/dist/Galmuri11-Bold.woff2', 'gsap/dist/gsap.min.js'];

// Editors may start Electron as plain Node
delete process.env.ELECTRON_RUN_AS_NODE;

if (has('no-record')) console.log(`Using the footage already in ${footage}`);
else run('npx', ['playwright', 'test', '-c', 'demo/playwright.config.ts', 'record.spec.ts'], path.join(here, '..'));

if (!has('no-record'))
  run(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      'frames.txt',
      '-vf',
      'fps=30',
      '-c:v',
      'libx264',
      '-crf',
      '14',
      'app.mp4',
    ],
    footage,
  );

// Each scene: where it starts in the footage, where it ends, and how long it lasts in the video. The page holds the
// same lengths, so a mark only decides which part of the footage a scene shows, never where the scene sits.
const m = JSON.parse(fs.readFileSync(path.join(footage, 'marks.json'), 'utf-8'));
const scenes = (() => {
  const stage = (step, nth = 0) => m.stages.filter((s) => s.text === step)[nth].at;
  const plan = stage('Assign');
  const build = stage('Develop');
  const bounce = stage('Code review');
  const fix = stage('Fixing');
  const test = stage('Code review', 1);
  return [
    ['intro', m.open + 1.8, m.ask, 1.2],
    ['ask', m.ask + 0.1, m.sent - 0.15, 3],
    ['plan', plan + 0.1, build, 2],
    ['build', build + 0.2, bounce, 1.8],
    ['bounce', bounce + 0.3, fix, 1.6],
    ['fix', fix + 0.2, test, 1.6],
    ['test', test + 0.3, m.done, 1.5],
    ['report', null, null, 2.6],
    ['diff', null, null, 2.3],
    ['log', null, null, 2.6],
    ['wiki', null, null, 1.2],
    ['wiki-doc', null, null, 1.8],
    ['workflow', null, null, 1.3],
    ['workflow-owner', null, null, 1.8],
    ['history', null, null, 1.1],
    ['history-chat', null, null, 1.5],
    ['end', m.open + 2.6, m.ask, 1.3],
  ];
})();
const total = scenes.reduce((sum, [, , , length]) => sum + length, 0);
// The page and this list have to agree, or every caption after the first wrong one sits on the wrong picture
const claimed = Number(
  fs
    .readFileSync(path.join(project, 'index.html'), 'utf-8')
    .match(/data-composition-id="main"[\s\S]*?data-duration="([\d.]+)"/)?.[1],
);
if (Math.abs(claimed - total) > 0.01)
  throw new Error(`index.html is ${claimed}s long but the scenes add up to ${total}s`);

fs.mkdirSync(clips, { recursive: true });
for (const f of BESIDE) fs.copyFileSync(path.join(here, '..', 'node_modules', f), path.join(clips, path.basename(f)));
for (const [name, from, to, length] of scenes) {
  if (from === null) continue;
  const span = Math.max(to - from, 0.3);
  run(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-ss',
      from.toFixed(3),
      '-t',
      span.toFixed(3),
      '-i',
      path.join(footage, 'app.mp4'),
      '-an',
      '-vf',
      `fps=30,tpad=stop_mode=clone:stop_duration=${length},trim=duration=${length}`,
      '-c:v',
      'libx264',
      '-crf',
      '14',
      path.join(clips, `${name}.mp4`),
    ],
    here,
  );
}

const film = 'renders/crew.mp4';
run('npx', ['--yes', 'hyperframes', 'lint'], project);
run('npx', ['--yes', 'hyperframes', 'render', '-o', film, '-q', 'high'], project);

const width = Number(flag('gif-width', 960));
const fps = Number(flag('gif-fps', 12));
const colors = Number(flag('gif-colors', 160));
// No smoothing and no blur: the app is pixel art and every sharp edge is the point. A palette built for motion keeps
// the camp's texture from banding, and a rectangle diff leaves the parts of a frame that did not move alone
const palette =
  `[0:v]trim=start=0:end=${total},setpts=PTS-STARTPTS,fps=${fps},scale=${width}:-1:flags=lanczos,split[a][b];` +
  `[a]palettegen=max_colors=${colors}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;
run(
  'ffmpeg',
  ['-y', '-loglevel', 'error', '-i', path.join(project, film), '-filter_complex', `"${palette}"`, '-loop', '0', gif],
  here,
);
const mb = fs.statSync(gif).size / 1e6;
console.log(`${gif}: ${mb.toFixed(1)} MB at ${width}px, ${fps}fps`);
if (mb > 20) console.log('  Too big for a README: try --gif-fps 12, --gif-colors 128, or --gif-width 800');
