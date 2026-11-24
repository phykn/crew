import { z } from 'zod';
import type { Sdk } from '../claude/agent';
import { text } from './text';
import type { Chat } from '../../app/chat';
import type { Member, Task } from '../../domain/records';
import type { Step } from '../../domain/workflow';
import { wikiTools } from './wiki';

// The app's tools for a member at work on one step: asking a colleague without going through 통역
export function memberTools(sdk: Sdk, chat: Chat, task: Task, step: Step, member: Member) {
  return sdk.createSdkMcpServer({
    name: 'crew',
    tools: [
      ...wikiTools(sdk, chat, member, task.sessionId, task.id),
      sdk.tool(
        'ask_peer',
        'Ask another crew member directly for a check or an answer you need for your step, such as 이미지 to read a screenshot. ' +
          'Their answer comes back as the result. If they ask you back, call again with the same request_id and your reply.',
        {
          role: z.string().describe('The member to ask: its key, such as images, or its Korean role'),
          message: z.string().describe('Your question, or your reply to their question'),
          expected: z.string().default('').describe('What you need back'),
          request_id: z.number().int().optional().describe('The request you are continuing'),
        },
        async (a) => text(await chat.requests.ask(task, step, member, a)),
      ),
    ],
  });
}
