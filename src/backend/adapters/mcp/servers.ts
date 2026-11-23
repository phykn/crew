import type { Chat } from '../../app/chat';
import type { ToolServers } from '../../app/ports';
import type { Sdk } from '../claude/agent';
import { appServer } from './app';
import { memberTools } from './member';
import { secretaryTools } from './secretary';

// The in-process tool servers, made through the SDK each time a run needs one
export function mcpServers(sdk: () => Promise<Sdk>, chat: Chat): ToolServers {
  return {
    secretary: async (sessionId) => secretaryTools(await sdk(), chat, sessionId),
    member: async (task, step, member) => memberTools(await sdk(), chat, task, step, member),
    app: async (sessionId) => appServer(await sdk(), chat, sessionId),
  };
}
