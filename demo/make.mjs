// Records the app, cuts the footage into the video's scenes, renders the video with HyperFrames, and turns it into the README's GIF
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const here = import.meta.dirname;
const video = path.join(here, 'video');
const assets = path.join(video, 'assets');
const run = (cmd, args, cwd = here) => execFileSync(cmd, args, { cwd, stdio: 'inherit', shell: true });

// Editors may start Electron as plain Node
delete process.env.ELECTRON_RUN_AS_NODE;
run('npx', ['playwright', 'test', '-c', 'demo/playwright.config.ts'], path.join(here, '..'));
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
  assets,
);

// Each scene: where it starts in the footage, where it ends, and how long it lasts in the video; index.html holds the same lengths
const m = JSON.parse(fs.readFileSync(path.join(assets, 'marks.json'), 'utf-8'));
const SCENES = [
  ['intro', m.open + 0.5, m.open + 3.5, 3],
  ['ask', m.type - 0.3, m.sent + 1.5, 5],
  ['work', m.sent + 1.5, m.done, 9],
  ['report', m.done - 0.5, m['로그'] + 3, 4.5],
  ['wiki', m['메모리'] + 0.2, m['메모리'] + 3.2, 3],
  ['workflow', m['워크플로우'] + 0.2, m['워크플로우'] + 3.2, 3],
  ['connect', m['연결'] + 0.2, m['연결'] + 2.8, 2.6],
];
for (const [name, from, to, length] of SCENES)
  run(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-ss',
      from.toFixed(3),
      '-t',
      (to - from).toFixed(3),
      '-i',
      'app.mp4',
      '-an',
      '-vf',
      `setpts=PTS*${(length / (to - from)).toFixed(4)},fps=30`,
      '-c:v',
      'libx264',
      '-crf',
      '14',
      `${name}.mp4`,
    ],
    assets,
  );

run('npx', ['--yes', 'hyperframes', 'lint'], video);
run('npx', ['--yes', 'hyperframes', 'render', '-o', 'renders/crew.mp4', '-q', 'high'], video);
// The camp's grain changes every pixel every frame, so it is smoothed and left undithered to keep the GIF near 15 MB
const gif = path.join(here, '..', 'assets', 'demo.gif');
const filter =
  'fps=10,scale=720:-1:flags=lanczos,hqdn3d=3:3:10:10,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=none:diff_mode=rectangle';
run('ffmpeg', ['-y', '-loglevel', 'error', '-i', 'renders/crew.mp4', '-vf', `"${filter}"`, gif], video);
console.log(`${gif}: ${(fs.statSync(gif).size / 1e6).toFixed(1)} MB`);
