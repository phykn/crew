import { z } from 'zod';
import type { Sdk } from '../claude/agent';
import { text } from './text';
import type { Chat } from '../../app/chat';
import type { Member, Task } from '../../domain/records';
import type { Step } from '../../domain/workflow';
import { wikiTools } from './wiki';
import { CANCEL, REFUSE } from '../../domain/answers';
import { baseKey } from '../../../shared';

// The app's tools for a member at work on one step: asking a colleague without going through the interpreter
export function memberTools(sdk: Sdk, chat: Chat, task: Task, step: Step, member: Member) {
  return sdk.createSdkMcpServer({
    name: 'crew',
    tools: [
      ...wikiTools(sdk, chat, member, task.sessionId, task.id),
      sdk.tool(
        'ask_peer',
        'Ask another crew member directly for a check or an answer you need for your step, such as the image describer (images) to read a screenshot. ' +
          'Their answer comes back as the result. If they ask you back, call again with the same request_id and your reply.',
        {
          role: z.string().describe('The member to ask, by its key, such as images'),
          message: z.string().describe('Your question, or your reply to their question'),
          expected: z.string().default('').describe('What you need back'),
          request_id: z.number().int().optional().describe('The request you are continuing'),
        },
        async (a) => text(await chat.requests.ask(task, step, member, a)),
      ),
      // Only the conductor puts a decision to the user, on a card under the interpreter's message
      ...(baseKey(member.key) === 'conductor'
        ? [
            sdk.tool(
              'ask_user',
              'Ask the user a decision only they can make, such as which of two ways the request means. Your run waits for their pick, which comes back as the result. Ask only when going on would otherwise guess.',
              {
                question: z.string().min(1).describe("The decision in one or two sentences, in the user's language"),
                options: z
                  .array(z.string().min(1))
                  .min(2)
                  .max(4)
                  .describe("Each choice, a few words in the user's language"),
              },
              async (a) => {
                const answer = await chat.questions.ask({
                  sessionId: task.sessionId,
                  taskId: task.id,
                  kind: 'choice',
                  say: {
                    code: 'card.decision',
                    role: member.key,
                    nickname: chat.crew.nicknameOf(member),
                    question: a.question,
                  },
                  options: a.options,
                  payload: { memberId: member.id },
                });
                return text(
                  answer === CANCEL || answer === REFUSE
                    ? 'The user did not answer; the task was stopped.'
                    : `The user chose: ${answer}`,
                );
              },
            ),
          ]
        : []),
    ],
  });
}
