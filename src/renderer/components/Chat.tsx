import { useEffect, useRef, useState } from 'react';
import type { Message, Mode, Question, Session, Task } from '../../main/db';
import { call, onChanged, onStream } from '../api';
import { Choice } from './Choice';
import { TaskCards } from './TaskCards';

// The window's own commands: typed after a slash, they act here and never reach 비서
export type Command = { name: string; label: string; run: () => void };

const MODE_LABELS: Record<Mode, string> = { manual: '묻기', auto: '자동', bypass: '전부' };

export function Chat({
  session,
  mode,
  onMode,
  onLog,
  commands,
}: {
  session: Session;
  mode: Mode;
  onMode: (m: Mode) => void;
  onLog: (taskId: number) => void;
  commands: Command[];
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const [pick, setPick] = useState(0);
  // A lone word after a slash lists the commands it could start
  const matches = /^\/\S*$/.test(draft) ? commands.filter((c) => `/${c.name}`.startsWith(draft)) : [];
  const picked = matches[Math.min(pick, matches.length - 1)];

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
    const command = commands.find((c) => `/${c.name}` === text);
    if (command) return command.run();
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
        {picked && (
          <ul className="menu slash-menu" role="listbox" aria-label="명령">
            {matches.map((m) => (
              <li
                key={m.name}
                role="option"
                aria-selected={m === picked}
                className="menu-item"
                data-highlighted={m === picked || undefined}
                onMouseDown={(e) => {
                  e.preventDefault();
                  setDraft('');
                  m.run();
                }}
              >
                <b>/{m.name}</b> <span className="muted">{m.label}</span>
              </li>
            ))}
          </ul>
        )}
        <textarea
          value={draft}
          placeholder="메시지 보내기"
          aria-label="메시지"
          rows={1}
          onChange={(e) => {
            setDraft(e.target.value);
            setPick(0);
          }}
          onKeyDown={(e) => {
            if (picked) {
              const move = { ArrowDown: 1, ArrowUp: -1 }[e.key];
              if (move) {
                e.preventDefault();
                return setPick((pick + move + matches.length) % matches.length);
              }
              // Tab completes the picked command; Enter runs it at once
              if (e.key === 'Tab' || (e.key === 'Enter' && !e.nativeEvent.isComposing)) {
                e.preventDefault();
                if (e.key === 'Tab') return setDraft(`/${picked.name}`);
                setDraft('');
                return picked.run();
              }
              if (e.key === 'Escape') return setDraft('');
            }
            // Enter sends and Shift+Enter breaks the line; composing Korean must not send half a syllable
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Choice
          label="승인 모드"
          className="small"
          value={mode}
          options={Object.entries(MODE_LABELS).map(([value, label]) => ({ value, label }))}
          onChange={(m) => onMode(m as Mode)}
        />
        {streaming !== null ? (
          <button
            type="button"
            className="send stop"
            aria-label="중지"
            onClick={() => call('messages.stop', { sessionId: session.id })}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <rect x="5" y="5" width="10" height="10" rx="1.5" fill="currentColor" />
            </svg>
          </button>
        ) : (
          <button type="submit" className="send" aria-label="보내기" disabled={!draft.trim()}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 3l15 7-15 7 2.5-7z" fill="currentColor" />
            </svg>
          </button>
        )}
      </form>
    </div>
  );
}

type BubbleProps = { author: Message['author']; text: string; pending?: boolean; question?: Question | null };

function Bubble({ author, text, pending, question }: BubbleProps) {
  // Only two people talk here, so the side a bubble sits on says who said it: me right, 비서 left
  return (
    <div
      className={`message ${author}`}
      data-pending={pending || undefined}
      aria-label={author === 'user' ? '나' : '비서'}
    >
      {question ? (
        <AnswerCard question={question} />
      ) : (
        <div className="bubble">{text ? renderInline(text) : pending ? <span className="typing">···</span> : ''}</div>
      )}
    </div>
  );
}

function AnswerCard({ question }: { question: Question }) {
  // The pick shows at once, before the record comes back with it
  const [picked, setPicked] = useState<string | null>(null);
  const answer = question.answer ?? picked;
  return (
    <div className="answer-card" data-answered={answer !== null || undefined}>
      <div className="answer-prompt">{renderInline(question.prompt)}</div>
      {answer !== null ? (
        <p className="answer-result" role="status">
          ✓ {answer}
        </p>
      ) : (
        <div className="answer-options">
          {question.options.map((o, i) => (
            <button
              key={o}
              className={`answer-option${i === question.options.length - 1 ? ' primary' : ''}`}
              onClick={() => {
                setPicked(o);
                call('questions.answer', { id: question.id, choice: o });
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Agents write file names in backticks and lead points in bold; those two are the only formatting chat needs
function renderInline(text: string) {
  return text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/).map((part, i) => {
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>;
    return part;
  });
}
