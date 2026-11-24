import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { loadCrew } from '../../src/backend/adapters/files/crew';
import { CREW_DIR, openChat } from '../support';

test('a permission change is recorded by name, never with the server settings it touches', () => {
  // A crew copy whose browser server carries a token in its environment
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'crew-copy-'));
  fs.cpSync(CREW_DIR, dir, { recursive: true });
  const file = path.join(dir, 'mcp.json');
  const mcp = JSON.parse(fs.readFileSync(file, 'utf-8'));
  mcp.mcpServers.browser.env = { API_TOKEN: 'secret-123' };
  fs.writeFileSync(file, JSON.stringify(mcp));
  const { store, chat, p } = openChat({}, { crew: loadCrew(dir) });
  const tester = store.readMember(p.id, 'tester');
  chat.members.setPermissions(tester.id, { mcp: [{ server: 'browser', access: 'read' }], skills: ['verify'] });

  const [change] = store.listPermissionChanges(tester.id);
  expect(change.change).toBe('스킬 -verdict, MCP +browser(읽기만), MCP -browser(전체)');
  expect(JSON.stringify(store.listPermissionChanges(tester.id))).not.toContain('secret-123');
});

test("a crew change is logged in the project's latest session, where the user is looking", () => {
  const { store, chat, p, s } = openChat();
  const latest = chat.createSession(p.id);
  chat.members.fire(store.readMember(p.id, 'tester').id);
  expect([store.listEvents(s.id), store.listEvents(latest.id).map((e) => e.text)]).toEqual([[], ['시험(시우) 퇴장']]);
});

test('a reset brings a member back as shipped: nickname, model, hired, and no permission changes', () => {
  const { store, chat, p } = openChat();
  const coder = chat.members.find(p.id, 'coder')!;
  const shipped = chat.members.settings(coder);
  chat.members.update(coder.id, { nickname: '망치', model: 'opus', status: 'unhired' });
  chat.members.setPermissions(coder.id, { tools: ['read'] });
  chat.members.reset(coder.id);
  const back = store.readMemberById(coder.id);
  expect(back).toMatchObject({ nickname: coder.nickname, model: coder.model, status: 'hired', config: {} });
  expect(chat.members.settings(back)).toEqual(shipped);
});
