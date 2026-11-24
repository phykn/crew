import { expect, test } from 'vitest';
import { wikiTools } from '../../../src/backend/adapters/mcp/wiki';
import { openChat, toolText } from '../../support';

test('a member who would start a document on files a colleague wrote about since its run began reads that one first', async () => {
  const { store, fake, chat, p, s } = openChat();
  const reviewer = store.readMember(p.id, 'reviewer');
  wikiTools(fake.sdk, chat, reviewer, s.id, null);
  // 시험, working beside 코드 검토, writes after 코드 검토's run began, so 코드 검토's prompt never listed it
  chat.wiki.write(p.id, '테트리스 테스트', 'node tetris.test.js', {
    memberId: null,
    name: '시험',
    files: ['tetris.js'],
  });
  const write = (title: string, files: string[]) => toolText(fake, 'wiki_write', { title, body: 'b', files });

  expect(await write('테트리스 구조', ['tetris.js', 'main.js'])).toContain('"테트리스 테스트"');
  expect(chat.wiki.find(p.id, '테트리스 구조')).toBeFalsy();
  // Told once, the member may still decide its topic is its own
  expect(await write('테트리스 구조', ['tetris.js', 'main.js'])).toBe('작성: 테트리스 구조');
  // Other files, or an existing document, are written at once
  expect(await write('화면 색', ['style.css'])).toBe('작성: 화면 색');
  expect(await write('테트리스 테스트', ['tetris.js'])).toBe('수정: 테트리스 테스트');
});
