import { z } from 'zod';
import type { Chat } from './chat';
import type { Member, PeerLine, Task } from '../domain/records';
import type { Step } from '../domain/workflow';
import { baseKey } from '../../shared';

const PeerAnswer = z.object({
  answer: z.string().describe('Your answer in Korean, or empty when you need to ask back first'),
  ask_back: z.string().optional().describe('A question for the asker when you cannot answer without it'),
});
const PEER_SCHEMA = z.toJSONSchema(PeerAnswer, { target: 'draft-7', io: 'input' }) as Record<string, unknown>;

// A member asking a colleague directly mid-step, as a thread on record that either side may continue
export class Requests {
  constructor(public chat: Chat) {}

  async ask(
    task: Task,
    step: Step,
    member: Member,
    a: { role: string; message: string; expected?: string; request_id?: number },
  ) {
    const { chat } = this;
    const { store, crew } = chat;
    const peer = chat.members.find(store.projectOf(task.sessionId).id, a.role);
    if (!peer) return `${a.role} is not a crew member.`;
    if (peer.status !== 'hired') return `${a.role} is not hired now; say so in your handback.`;
    // Each member works one run at a time, so asking oneself, or a member at work, would wait on a run that waits on this one
    if (peer.id === member.id) return 'You cannot ask yourself; decide it in your step.';
    // The record names the peer by its role, however it was asked for
    const to = crew.defOf(peer).role;
    const busy = () =>
      `${to} is at work on its own step now; decide without it and note the open question in your handback.`;
    // Refused before a request is recorded, so a busy peer leaves no empty thread behind
    if (a.request_id === undefined && chat.runs.busy(peer.id)) return busy();
    const id =
      a.request_id ??
      store.createRequest({
        taskId: task.id,
        stepId: step.id,
        fromMember: member.id,
        toRole: to,
        expected: a.expected ?? '',
      });
    const req = store.readRequest(id);
    if (req.taskId !== task.id) return `Request ${id} belongs to another task.`;
    const from = crew.defOf(member).role;
    // A resent line that was already answered is not run again: the answer on record is returned
    const at = req.thread.findIndex((l, i) => l.from === from && l.text === a.message && req.thread[i + 1]);
    if (at >= 0) return reply(id, req.thread[at + 1]);
    if (chat.runs.busy(peer.id)) return busy();
    const thread: PeerLine[] = [...req.thread, { from, text: a.message }];
    store.writeThread(id, thread);
    store.addEvent({
      sessionId: task.sessionId,
      taskId: task.id,
      memberId: member.id,
      kind: 'request',
      say: { code: 'request', from: baseKey(member.key), to: baseKey(peer.key), text: a.message },
      detail: JSON.stringify({ requestId: id, to: peer.id }),
    });
    const prompt = [
      `[Request #${id} in task #${task.id} "${task.title}"] ${from} asks you during the step ${step.label}.`,
      req.expected ? `They need: ${req.expected}` : '',
      thread.map((l) => `${l.from}: ${l.text}`).join('\n'),
      'Answer it, or ask back one question if you cannot answer without it. Answer in Korean.',
    ]
      .filter(Boolean)
      .join('\n\n');
    const out = await chat.runs.run(peer, task.sessionId, task.id, prompt, {
      schema: PEER_SCHEMA,
      alive: () => !chat.tasks.halted(task.id),
    });
    const parsed = PeerAnswer.safeParse(out.structured);
    const line: PeerLine = parsed.success
      ? { from: to, text: parsed.data.ask_back ? `?${parsed.data.ask_back}` : parsed.data.answer }
      : { from: to, text: `!${out.error ?? 'no answer'}` };
    store.writeThread(id, [...thread, line]);
    store.addEvent({
      sessionId: task.sessionId,
      taskId: task.id,
      memberId: peer.id,
      kind: 'request',
      say: { code: 'request', from: baseKey(peer.key), to: baseKey(member.key), text: line.text },
      detail: JSON.stringify({ requestId: id, to: member.id, answer: true }),
    });
    return reply(id, line);
  }
}

function reply(id: number, line: PeerLine) {
  if (line.text.startsWith('?'))
    return `Request ${id}: ${line.from} asks back: ${line.text.slice(1)} Reply with ask_peer, request_id ${id}.`;
  if (line.text.startsWith('!')) return `Request ${id}: ${line.from} could not answer (${line.text.slice(1)}).`;
  return `Request ${id}: ${line.from} answers: ${line.text}`;
}
