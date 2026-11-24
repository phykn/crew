import type { Question } from '../domain/records';
import type { ConversationRecords, Feed } from './ports';
import { CANCEL } from '../domain/answers';

// Questions 통역 puts to the user as answer cards under its message; a waiting run resumes when the user picks
export class Questions {
  waiters = new Map<number, (answer: string) => void>();

  constructor(
    public store: ConversationRecords,
    public emit: Feed,
  ) {}

  ask(q: Omit<Question, 'id' | 'answer'>): Promise<string> {
    const id = this.store.addQuestion(q);
    this.store.addMessage(q.sessionId, 'secretary', q.prompt, id);
    // The waiter is in place before anyone hears of the card, so an instant answer is not lost
    const answered = new Promise<string>((resolve) => this.waiters.set(id, resolve));
    this.emit('changed', { topic: 'messages', sessionId: q.sessionId });
    this.emit('notify', { sessionId: q.sessionId, text: q.prompt });
    return answered;
  }

  // A pick-one card that belongs to no task, such as which task the user meant
  choose(sessionId: number, prompt: string, options: string[]) {
    return this.ask({ sessionId, taskId: null, kind: 'choice', prompt, options, payload: {} });
  }

  answer(id: number, choice: string) {
    const q = this.store.readQuestion(id);
    if (q.answer !== null) throw new Error('this question was already answered');
    if (!q.options.includes(choice)) throw new Error(`"${choice}" is not one of the options`);
    this.settle(id, q.sessionId, choice);
  }

  // A card whose asker is gone, such as 통역's stopped answer: closed, so the chat no longer waits on it
  cancel(id: number) {
    this.settle(id, this.store.readQuestion(id).sessionId, CANCEL);
  }

  settle(id: number, sessionId: number, answer: string) {
    this.store.answerQuestion(id, answer);
    this.emit('changed', { topic: 'messages', sessionId });
    this.waiters.get(id)?.(answer);
    this.waiters.delete(id);
  }
}
