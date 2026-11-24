import { expect, test } from 'vitest';
import { wikiTools } from '../../../src/backend/adapters/mcp/wiki';
import { openChat, toolText } from '../../support';

test('only the librarian gets the tools that write the wiki, and its writes are logged and indexed', async () => {
  const { store, fake, chat, p, s } = openChat();
  const names = (key: string) => wikiTools(fake.sdk, chat, store.readMember(p.id, key), s.id, null).map((t) => t.name);
  expect(names('coder')).toEqual(['wiki_read', 'remember']);
  expect(names('librarian')).toEqual(['wiki_read', 'remember', 'wiki_write', 'wiki_delete']);

  expect(await toolText(fake, 'wiki_write', { title: '테스트 방법', body: 'npm test로 돌린다\n\n[[구조]]' })).toBe(
    'Written: 테스트 방법',
  );
  expect(await toolText(fake, 'wiki_write', { title: 'index', body: 'x' })).toContain('cannot be a document title');
  expect(chat.wiki.list(p.id)).toEqual([{ title: '테스트 방법', body: 'npm test로 돌린다\n\n[[구조]]\n' }]);
  expect(chat.wiki.find(p.id, 'index')).toBeNull();
  expect(chat.wiki.timeline(p.id)).toMatchObject([{ kind: 'create', title: '테스트 방법', author: 'librarian' }]);
  expect(await toolText(fake, 'wiki_delete', { title: '테스트 방법' })).toBe('Deleted: 테스트 방법');
  expect(chat.wiki.list(p.id)).toEqual([]);
});
