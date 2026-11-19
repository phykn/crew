import { useEffect, useRef, useState } from 'react';
import type { Message, Question, Session, Task } from '../../main/db';
import { call, onChanged, onStream } from '../api';
import { TaskCards } from './TaskCards';

export function Chat({ session, onLog, onClear }: { session: Session; onLog: (taskId: number) => void; onClear: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () => call('messages.list', { sessionId: session.id }).then(setMessages);
    const loadTasks = () => call('tasks.list', { sessionId: session.id }).then(setTasks);
    load();
    loadTasks();
    setStreaming(null);
    const offChanged = onChanged((topic) => (topic === 'messages' ? load() : topic === 'tasks' && loadTasks()));
    const offStream = onStream((ev) => {
      if (ev.sessionId !== session.id) return;
      setStreaming((s) => (ev.done ? null : (s ?? '') + (ev.delta ?? '')));
    });
    return () => {
      offChanged();
      offStream();
    };
  }, [session.id]);

  // Braces matter: scrollIntoView returns a promise in current Chromium, which React would take for a cleanup
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages, streaming]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    // /clear is the window's own command: a new session, not a message to 비서
    if (text === '/clear') return onClear();
    // Shows the thinking state at once; the first streamed words replace it
    setStreaming((s) => s ?? '');
    call('messages.send', { sessionId: session.id, text });
  }

  return (
    <div className="chat">
      <TaskCards tasks={tasks} messages={messages} onLog={onLog} />
      <div className="messages" aria-label="대화">
        {messages.map((m) => (
          <Bubble key={m.id} author={m.author} text={m.text} question={m.question} />
        ))}
        {streaming !== null && <Bubble author="secretary" text={streaming} pending />}
        <div ref={end} />
      </div>
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          value={draft}
          placeholder="비서에게 메시지 보내기"
          aria-label="메시지"
          rows={1}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter sends and Shift+Enter breaks the line; composing Korean must not send half a syllable
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button type="submit" className="send" aria-label="보내기" disabled={!draft.trim()}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M3 3l15 7-15 7 2.5-7z" fill="currentColor" />
          </svg>
        </button>
      </form>
    </div>
  );
}

type BubbleProps = { author: Message['author']; text: string; pending?: boolean; question?: Question | null };

function Bubble({ author, text, pending, question }: BubbleProps) {
  const mine = author === 'user';
  return (
    <div className={`message ${author}`} data-pending={pending || undefined}>
      <div className="avatar" aria-hidden="true">
        {mine ? (
          <svg viewBox="0 0 20 20">
            <circle cx="10" cy="7" r="3.5" fill="currentColor" />
            <path d="M3.5 17a6.5 6.5 0 0 1 13 0z" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 20 20">
            <rect x="4" y="6" width="12" height="10" rx="3" fill="currentColor" />
            <rect x="9.2" y="2.5" width="1.6" height="3.5" fill="currentColor" />
            <circle cx="7.8" cy="11" r="1.3" fill="#2a1d4a" />
            <circle cx="12.2" cy="11" r="1.3" fill="#2a1d4a" />
          </svg>
        )}
      </div>
      <div className="message-body">
        <div className="author">{mine ? '나' : '비서'}</div>
        {question ? (
          <AnswerCard question={question} />
        ) : (
          <div className="bubble">{text ? renderInline(text) : pending ? <span className="typing">···</span> : ''}</div>
        )}
      </div>
    </div>
  );
}

function AnswerCard({ question }: { question: Question }) {
  const answered = question.answer !== null;
  return (
    <div className="answer-card" data-answered={answered || undefined}>
      <div className="answer-prompt">{renderInline(question.prompt)}</div>
      <div className="answer-options">
        {question.options.map((o, i) => (
          <button
            key={o}
            className={`answer-option${i === question.options.length - 1 ? ' primary' : ''}`}
            data-chosen={question.answer === o || undefined}
            disabled={answered}
            onClick={() => call('questions.answer', { id: question.id, choice: o })}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

// Agents write file names in backticks; showing them as code is the only formatting chat needs
function renderInline(text: string) {
  return text.split(/(`[^`\n]+`)/).map((part, i) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 2 ? <code key={i}>{part.slice(1, -1)}</code> : part,
  );
}
