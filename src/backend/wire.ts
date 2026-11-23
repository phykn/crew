import { Chat } from './app/chat';
import type { Feed, Paths, Records } from './app/ports';
import type { Crew } from './domain/crew';
import { ClaudeAgent, type Sdk } from './adapters/claude/agent';
import { DiskFiles } from './adapters/files/files';
import { GitVersions } from './adapters/git/versions';
import { mcpServers } from './adapters/mcp/servers';

// Puts the app together: the record, the crew, and where its words go come from the caller; the rest are the real adapters
export function wire(o: { records: Records; sdk: () => Promise<Sdk>; crew: Crew; emit: Feed; paths: Paths }) {
  return new Chat({
    records: o.records,
    agent: new ClaudeAgent(o.sdk),
    files: new DiskFiles(),
    versions: new GitVersions(),
    crew: o.crew,
    emit: o.emit,
    paths: o.paths,
    tools: (chat) => mcpServers(o.sdk, chat),
  });
}
