import { Chat } from './app/chat';
import type { Feed, Paths, Records, Secrets } from './app/ports';
import type { Crew } from './domain/crew';
import { ClaudeAgent, type Sdk } from './adapters/claude/agent';
import { DiskFiles } from './adapters/files/files';
import { GitVersions } from './adapters/git/versions';
import { mcpServers } from './adapters/mcp/servers';

// Puts the app together: the record, the crew, and where its words go come from the caller; the rest are the real adapters
export function wire(o: {
  records: Records;
  secrets: Secrets;
  sdk: () => Promise<Sdk>;
  crew: Crew;
  emit: Feed;
  paths: Paths;
}) {
  // Runs ask the hub's connections which key they go with, and the hub needs the agent first
  const chat: Chat = new Chat({
    records: o.records,
    agent: new ClaudeAgent(o.sdk, () => chat.connections.key()),
    secrets: o.secrets,
    files: new DiskFiles(),
    versions: new GitVersions(),
    crew: o.crew,
    emit: o.emit,
    paths: o.paths,
    tools: (hub) => mcpServers(o.sdk, hub),
  });
  return chat;
}
