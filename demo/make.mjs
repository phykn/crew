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

const lang = flag('lang', 'ko');
if (lang !== 'ko' && lang !== 'en') throw new Error(`--lang takes ko or en, not ${lang}`);
const video = path.join(here, 'video');
// A HyperFrames project holds one root composition, so each language has its own page and its own clips
const project = lang === 'en' ? path.join(video, 'en') : video;
const clips = path.join(project, 'assets');
const footage = path.join(video, 'assets');
const gif = path.join(here, '..', 'assets', lang === 'en' ? 'demo-en.gif' : 'demo.gif');
const run = (cmd, args, cwd = here) => execFileSync(cmd, args, { cwd, stdio: 'inherit', shell: true });
// What the page needs from beside it: the app's own font and animation library, beside the clips it plays
const BESIDE = ['galmuri/dist/Galmuri11.woff2', 'galmuri/dist/Galmuri11-Bold.woff2', 'gsap/dist/gsap.min.js'];

// Editors may start Electron as plain Node
delete process.env.ELECTRON_RUN_AS_NODE;

if (has('no-record')) console.log(`Using the footage already in ${footage}`);
else
  run(
    'npx',
    ['playwright', 'test', '-c', 'demo/playwright.config.ts', lang === 'en' ? 'record.en.spec.ts' : 'record.spec.ts'],
    path.join(here, '..'),
  );

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
// A missing mark borrows the moment after the one before it, so one step that never showed cannot leave a cut without a start
const fill = (list) => {
  let last = 0;
  return list.map((v) => (Number.isFinite(v) ? (last = v) : (last += 1)));
};

const SCENES = {
  ko: () => [
    ['intro', m.open + 0.5, m.open + 3.5, 3],
    ['ask', m.type - 0.3, m.sent + 1.5, 5],
    ['work', m.sent + 1.5, m.done, 9],
    ['report', m.done - 0.5, m['로그'] + 3, 4.5],
    ['wiki', m['메모리'] + 0.2, m['메모리'] + 3.2, 3],
    ['workflow', m['워크플로우'] + 0.2, m['워크플로우'] + 3.2, 3],
    ['connect', m['연결'] + 0.2, m['연결'] + 2.8, 2.6],
    ['end', m.open + 0.5, m.open + 2.5, 2.5],
  ],
  en: () => {
    const stage = (step, nth = 0) => (m.stages ?? []).filter((s) => s.text === step)[nth]?.at;
    const t = fill([
      m.open,
      m.ask,
      m.sent,
      stage('Plan'),
      stage('Plan review'),
      stage('Develop', 0),
      stage('Code review', 0),
      stage('Fixing'),
      stage('Code review', 1),
      m.done,
      m.diff,
      m.wiki,
      m.workflow,
      m.connect,
    ]);
    return [
      ['intro', t[0] + 0.3, t[0] + 2.9, 2.6],
      ['camp', t[0] + 1.4, t[1] - 0.1, 2.8],
      ['ask', t[1] - 0.1, t[2] + 0.7, 3.8],
      ['plan', t[3] + 0.1, t[4], 2.4],
      ['build', t[5] + 0.1, t[6], 3.4],
      ['bounce', t[6] + 0.1, t[7], 2.8],
      ['fix', t[7] + 0.1, t[8], 2.8],
      ['test', t[8] + 0.1, t[9] - 0.1, 3],
      ['report', t[9] + 0.1, t[10] - 0.1, 3.2],
      ['diff', t[10], t[11] - 0.2, 2.6],
      ['wiki', t[11] + 0.2, t[12] - 0.2, 2.2],
      ['workflow', t[12] + 0.2, t[13] - 0.2, 2.2],
      ['connect', t[13] + 0.2, t[13] + 2, 2],
      ['end', t[0] + 2, t[1] - 0.1, 2.6],
    ];
  },
};

const scenes = SCENES[lang]();
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
  const span = Math.max(to - from, 0.3);
  const footageFilter =
    lang === 'en'
      ? `fps=30,tpad=stop_mode=clone:stop_duration=${length},trim=duration=${length}`
      : `setpts=PTS*${(length / span).toFixed(4)},fps=30,tpad=stop_mode=clone:stop_duration=0.5`;
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
      footageFilter,
      '-c:v',
      'libx264',
      '-crf',
      '14',
      path.join(clips, `${name}.mp4`),
    ],
    here,
  );
}

const film = `renders/crew-${lang}.mp4`;
run('npx', ['--yes', 'hyperframes', 'lint'], project);
run('npx', ['--yes', 'hyperframes', 'render', '-o', film, '-q', 'high'], project);

// The GIF opens the README, so it carries the hook, the party at work, the green result and the sign-off;
// the film itself has the rest. Cutting it is what keeps a sharper GIF inside a README's size
const CUTS = {
  // The hook, the crew at work, the result, then the sign-off. A README cannot take the whole film at a sharp size,
  // so the places the work lands are left to the film; --gif-full puts them back
  ko: [
    [0, 21.5],
    [30.1, 32.6],
  ],
  en: [
    [0.4, 2.6],
    [3, 8.8],
    [9.3, 11.2],
    [11.8, 14.6],
    [15.2, 17.4],
    [18, 20.2],
    [20.8, 23.3],
    [23.8, 26.2],
    [36, 38.1],
  ],
};
const width = Number(flag('gif-width', lang === 'en' ? 800 : 960));
const fps = Number(flag('gif-fps', lang === 'en' ? 10 : 12));
const colors = Number(flag('gif-colors', lang === 'en' ? 160 : 200));
const cuts = has('gif-full') ? [[0, total]] : CUTS[lang];
// No smoothing and no blur: the app is pixel art and every sharp edge is the point. A palette built for motion keeps
// the camp's texture from banding, and a rectangle diff leaves the parts of a frame that did not move alone
const trimmed = cuts.map(([a, b], i) => `[0:v]trim=start=${a}:end=${b},setpts=PTS-STARTPTS[v${i}]`).join(';');
const joined = cuts.length > 1 ? `;${cuts.map((_, i) => `[v${i}]`).join('')}concat=n=${cuts.length}:v=1:a=0[cut]` : '';
const palette =
  `${cuts.length > 1 ? '[cut]' : '[v0]'}fps=${fps},scale=${width}:-1:flags=lanczos,split[a][b];` +
  `[a]palettegen=max_colors=${colors}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;
run(
  'ffmpeg',
  [
    '-y',
    '-loglevel',
    'error',
    '-i',
    path.join(project, film),
    '-filter_complex',
    `"${trimmed}${joined};${palette}"`,
    '-loop',
    '0',
    gif,
  ],
  here,
);
const mb = fs.statSync(gif).size / 1e6;
console.log(`${gif}: ${mb.toFixed(1)} MB at ${width}px, ${fps}fps`);
if (mb > 20) console.log('  Too big for a README: try --gif-fps 12, --gif-colors 128, or --gif-width 800');
