import { crc32, deflateSync } from 'node:zlib';
import { randomBytes } from 'node:crypto';
import { expect, test } from 'vitest';
import { loadSdk } from '../../src/backend/agents/run';
import { Chat } from '../../src/backend/chat';
import { Store } from '../../src/backend/db';
import type { Image } from '../../src/shared';
import { CREW, makeScratch, recordedRuns } from '../support';

// A PNG from raw RGB rows, so a test can make one solid colour or one too noisy to compress
function png(width: number, height: number, pixel: (x: number, y: number) => number[]): Image {
  const rows = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) rows.set(pixel(x, y), y * (width * 3 + 1) + 1 + x * 3);
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const size = Buffer.alloc(4);
    size.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([size, body, crc]);
  };
  const head = Buffer.alloc(13);
  head.writeUInt32BE(width, 0);
  head.writeUInt32BE(height, 4);
  head.set([8, 2, 0, 0, 0], 8);
  const file = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', head),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return { mediaType: 'image/png', data: file.toString('base64') };
}

function haikuChat() {
  const scratch = makeScratch();
  const store = new Store(scratch.db);
  const chat = new Chat(store, loadSdk, CREW, () => {}, scratch.paths);
  const p = store.addProject(scratch.project);
  chat.members.seed(p.id);
  const s = store.createSession(p.id);
  // Haiku keeps the live run cheap; reading a colour needs no more
  store.updateMember(store.readMember(p.id, 'orchestrator').id, { model: 'haiku' });
  const last = () => store.listMessages(s.id).at(-1)!.text;
  return { store, chat, s, last };
}

const RED = png(32, 32, () => [230, 20, 20]);
const BLUE = png(32, 32, () => [20, 40, 230]);

test('real Claude: 비서 sees a picture, takes one without words, and still knows it in the next turn', async () => {
  const { store, chat, s, last } = haikuChat();
  await chat.send(s.id, '이 그림은 무슨 색이야? 색 이름 한 단어로만 답해.', [RED]);
  expect(last()).toMatch(/빨|red/i);

  await chat.send(s.id, '', [BLUE]);
  await chat.send(s.id, '첫 번째 그림과 두 번째 그림은 각각 무슨 색이었지? 색 이름만.');
  expect(last()).toMatch(/빨|red/i);
  expect(last()).toMatch(/파|blue/i);
  expect(recordedRuns(store, s.id).map((r) => r.status)).toEqual(['done', 'done', 'done']);
});

test('real Claude: a picture sent while 비서 is answering gets its own answer', async () => {
  const { store, chat, s } = haikuChat();
  const first = chat.send(s.id, '1부터 5까지 한 줄에 하나씩 세어 줘.');
  // The second message joins the run under way, as Enter does in the window
  while (!chat.runs.live(s.id)) await new Promise((r) => setTimeout(r, 50));
  await chat.send(s.id, '이 그림은 무슨 색이야? 색 이름 한 단어로만.', [BLUE]);
  await first;
  const replies = store.listMessages(s.id).filter((m) => m.author === 'secretary');
  expect(replies.some((m) => /파|blue/i.test(m.text))).toBe(true);
});

test('real Claude: a picture near the window’s 5MB cap is taken', async () => {
  const { store, chat, s, last } = haikuChat();
  const noise = randomBytes(1250 * 1250 * 3);
  const big = png(1250, 1250, (x, y) => [...noise.subarray((y * 1250 + x) * 3, (y * 1250 + x) * 3 + 3)]);
  const bytes = Buffer.from(big.data, 'base64').length;
  expect(bytes).toBeLessThan(5 * 1024 * 1024);
  await chat.send(s.id, '이 그림을 한 문장으로 설명해.', [big]);
  expect(recordedRuns(store, s.id).map((r) => r.status)).toEqual(['done']);
});
