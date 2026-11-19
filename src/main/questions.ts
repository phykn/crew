import type { Question, Store } from './db';

type Emit = (channel: 'changed', topic: string) => void;

// Questions 비서 puts to the user as answer cards under its message; a waiting run resumes when the user picks
export class Questions {
  waiters = new Map<number, (answer: string) => void>();

  constructor(
    public store: Store,
    public emit: Emit,
  ) {}

  ask(q: Omit<Question, 'id' | 'answer'>): Promise<string> {
    const id = this.store.addQuestion(q);
    this.store.addMessage(q.sessionId, 'secretary', q.prompt, id);
    // The waiter is in place before anyone hears of the card, so an instant answer is not lost
    const answered = new Promise<string>((resolve) => this.waiters.set(id, resolve));
    this.emit('changed', 'messages');
    return answered;
  }

  answer(id: number, choice: string) {
    const q = this.store.readQuestion(id);
    if (q.answer !== null) throw new Error('this question was already answered');
    if (!q.options.includes(choice)) throw new Error(`"${choice}" is not one of the options`);
    this.store.answerQuestion(id, choice);
    this.emit('changed', 'messages');
    this.waiters.get(id)?.(choice);
    this.waiters.delete(id);
  }
}

export const ALLOW = '허용';
export const REFUSE = '거절';
