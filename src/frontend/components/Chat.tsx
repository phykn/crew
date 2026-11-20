import { useEffect, useRef, useState } from 'react';
import type { Message, Question, Session, Task } from '../../backend/db';
import { IMAGE_TYPES, type Image, imageUrl, MODE_LABELS, type Mode } from '../../shared';
import { call, onChanged, onStream } from '../api';
import { Choice } from './Choice';
import { TaskCards } from './TaskCards';

// The window's own commands: typed after a slash, they act here and never reach 비서
// A label only where the name alone does not say it
type Command = { name: string; label?: string; run: () => void };
// What each approval mode lets a member do without asking
const MODE_HINTS: Record<Mode, string> = {
  manual: '역할 밖 도구는 카드로 확인',
  auto: '역할 밖 도구도 바로 허용',
  bypass: '아무것도 검사하지 않음',
};
// A message held back until 비서 is done answering
type Queued = { id: number; sessionId: number; text: string; images: Image[] };

// Claude takes up to five pictures of about 5MB each in one message
const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// How near the bottom still counts as at it, so a line's worth of rounding does not unstick the list
const STICK_PX = 24;

function readImage(file: File): Promise<Image | null> {
  const type = IMAGE_TYPES.find((t) => t === file.type);
  if (!type || file.size > MAX_IMAGE_BYTES) return Promise.resolve(null);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ mediaType: type, data: String(reader.result).split(',')[1] });
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

const src = (i: Image) => `data:${i.mediaType};base64,${i.data}`;

export function Chat({
  session,
  mode,
  onMode,
  onWaiting,
  onLog,
  commands,
}: {
  session: Session;
  mode: Mode;
  onMode: (m: Mode) => void;
  onWaiting: (waiting: boolean) => void;
  onLog: (taskId: number) => void;
  commands: Command[];
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [streaming, setStreaming] = useState<string | null>(null);
  // The session whose answering state the window has read; held messages wait until it is this one
  const [known, setKnown] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [images, setImages] = useState<Image[]>([]);
  const [queued, setQueued] = useState<Queued[]>([]);
  // Why the last pictures were left out, or that a message did not go
  const [notice, setNotice] = useState<string | null>(null);
  const nextId = useRef(0);
  // The list follows new words only while the user is at its bottom, so reading back is not pulled away
  const stick = useRef(true);
  const picker = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const [pick, setPick] = useState(0);
  // A lone word after a slash lists the commands it could start
  const matches = /^\/\S*$/.test(draft) ? commands.filter((c) => `/${c.name}`.startsWith(draft)) : [];
  const picked = matches[Math.min(pick, matches.length - 1)];

  useEffect(() => {
    let current = true;
    const load = () => call('messages.list', { sessionId: session.id }).then((m) => current && setMessages(m));
    const loadTasks = () => call('tasks.list', { sessionId: session.id }).then((t) => current && setTasks(t));
    load();
    loadTasks();
    setStreaming(null);
    // A draft belongs to the session it was written in
    setDraft('');
    setImages([]);
    setNotice(null);
    stick.current = true;
    call('messages.busy', { sessionId: session.id }).then((busy) => {
      if (!current) return;
      if (busy) setStreaming((s) => s ?? '');
      setKnown(session.id);
    });
    const offChanged = onChanged(
      (topic) => (topic === 'messages' ? load() : topic === 'tasks' && loadTasks()),
      session.id,
    );
    const offStream = onStream((ev) => {
      if (ev.sessionId !== session.id) return;
      setStreaming((s) => (ev.done ? null : (s ?? '') + (ev.delta ?? '')));
    });
    return () => {
      current = false;
      offChanged();
      offStream();
    };
  }, [session.id]);

  // Braces matter: scrollIntoView returns a promise in current Chromium, which React would take for a cleanup
  useEffect(() => {
    if (stick.current) end.current?.scrollIntoView({ block: 'end' });
  }, [messages, streaming, queued, images.length]);

  const waiting = messages.some((m) => m.question && m.question.answer === null);
  useEffect(() => onWaiting(waiting), [waiting]);

  // Once 비서 is done, the oldest held message goes; its answer holds the rest until it is done too
  useEffect(() => {
    const next = queued.find((q) => q.sessionId === session.id);
    if (known === session.id && streaming === null && next) sendQueued(next);
  }, [known, streaming, queued, session.id]);

  function dispatch(text: string, pictures: Image[]) {
    // Shows the thinking state at once; the first streamed words replace it
    setStreaming((s) => s ?? '');
    // A refused send never ends its stream, so the thinking state is cleared here
    call('messages.send', { sessionId: session.id, text, images: pictures }).catch(() => {
      setStreaming(null);
      setNotice('보내지 못했습니다. 다시 보내 주세요.');
    });
  }

  function sendQueued(q: Queued) {
    setQueued((qs) => qs.filter((x) => x.id !== q.id));
    dispatch(q.text, q.images);
  }

  // Now joins 비서's answer at once; later waits in line while 비서 is answering
  function send(later = false) {
    const text = draft.trim();
    if (!text && !images.length) return;
    setDraft('');
    setImages([]);
    setNotice(null);
    const command = !images.length && commands.find((c) => `/${c.name}` === text);
    if (command) return command.run();
    // What the user just said is shown, even if they had scrolled back to read
    stick.current = true;
    if (later && streaming !== null)
      return setQueued((qs) => [...qs, { id: nextId.current++, sessionId: session.id, text, images }]);
    dispatch(text, images);
  }

  async function attach(files: Iterable<File>) {
    const list = [...files];
    const read = (await Promise.all(list.map(readImage))).filter((i): i is Image => i !== null);
    const kept = read.slice(0, MAX_IMAGES - images.length);
    setImages([...images, ...kept]);
    const left = list.length - kept.length;
    setNotice(
      left
        ? `그림 ${left}장은 넣지 못했습니다. PNG, JPEG, GIF, WEBP 형식에${MAX_IMAGE_BYTES / 1024 / 1024}MB 이하, ${MAX_IMAGES}장까지 넣을 수 있습니다.`
        : null,
    );
  }

  return (
    <div className="chat">
      <TaskCards tasks={tasks} messages={messages} onLog={onLog} />
      <div
        className="messages"
        aria-label="대화"
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX;
        }}
      >
        {messages.map((m) => (
          <Bubble
            key={m.id}
            author={m.author}
            text={m.text}
            pictures={Array.from({ length: m.imageCount }, (_, n) => imageUrl(m.id, n))}
            question={m.question}
          />
        ))}
        {streaming !== null && <Bubble author="secretary" text={streaming} pending />}
        {queued
          .filter((q) => q.sessionId === session.id)
          .map((q) => (
            <div key={q.id} className="message user queued" aria-label="대기 중">
              <div className="bubble">
                <Pictures srcs={q.images.map(src)} />
                {q.text}
              </div>
              <button type="button" className="send-now" onClick={() => sendQueued(q)}>
                지금 보내기
              </button>
            </div>
          ))}
        <div ref={end} />
      </div>
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void attach(e.dataTransfer.files);
        }}
      >
        {notice && (
          <p className="composer-notice" role="status">
            {notice}
          </p>
        )}
        {images.length > 0 && (
          <ul className="attachments" aria-label="첨부한 그림">
            {images.map((img, n) => (
              <li key={n}>
                <img src={src(img)} alt={`그림 ${n + 1}`} />
                <button
                  type="button"
                  aria-label={`그림 ${n + 1} 빼기`}
                  onClick={() => setImages((have) => have.filter((_, k) => k !== n))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
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
                <b>/{m.name}</b> {m.label && <span className="muted">{m.label}</span>}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="attach"
          aria-label="그림 첨부"
          title="그림 첨부"
          disabled={images.length >= MAX_IMAGES}
          onClick={() => picker.current?.click()}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <input
          ref={picker}
          type="file"
          accept={IMAGE_TYPES.join(',')}
          multiple
          hidden
          aria-label="그림 파일"
          onChange={(e) => {
            void attach(e.target.files ?? []);
            e.target.value = '';
          }}
        />
        <textarea
          value={draft}
          placeholder="Ctrl+Enter 키로 대기열에 추가하기"
          aria-label="메시지"
          rows={1}
          onChange={(e) => {
            setDraft(e.target.value);
            setPick(0);
          }}
          onPaste={(e) => {
            const files = [...e.clipboardData.files].filter((x) => x.type.startsWith('image/'));
            if (!files.length) return;
            e.preventDefault();
            void attach(files);
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
            // Enter sends now, Ctrl+Enter waits for the answer, Shift+Enter breaks the line; composing Korean must not send half a syllable
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(e.ctrlKey || e.metaKey);
            }
          }}
        />
        <Choice
          label="승인 모드"
          className="small"
          value={mode}
          options={Object.entries(MODE_LABELS).map(([value, label]) => ({
            value,
            label,
            hint: MODE_HINTS[value as Mode],
          }))}
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
          <button type="submit" className="send" aria-label="보내기" disabled={!draft.trim() && !images.length}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 3l15 7-15 7 2.5-7z" fill="currentColor" />
            </svg>
          </button>
        )}
      </form>
    </div>
  );
}

type BubbleProps = {
  author: Message['author'];
  text: string;
  pictures?: string[];
  pending?: boolean;
  question?: Question | null;
};

function Pictures({ srcs }: { srcs: string[] }) {
  if (!srcs.length) return null;
  return (
    <div className="pictures">
      {srcs.map((s, n) => (
        <img key={n} src={s} alt={`첨부 그림 ${n + 1}`} loading="lazy" />
      ))}
    </div>
  );
}

function Bubble({ author, text, pictures = [], pending, question }: BubbleProps) {
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
        <div className="bubble">
          <Pictures srcs={pictures} />
          {text ? renderInline(text) : pending ? <span className="typing">···</span> : ''}
        </div>
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
                // A pick the record refused shows the options again
                call('questions.answer', { id: question.id, choice: o }).catch(() => setPicked(null));
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
  // A heading slips in now and then despite the rules; it reads as a bold line instead of stray #s
  return text
    .replace(/^#{1,6}\s+(.+?)\s*$/gm, '**$1**')
    .split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/)
    .map((part, i) => {
      if (part.length > 2 && part.startsWith('`') && part.endsWith('`'))
        return <code key={i}>{part.slice(1, -1)}</code>;
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>;
      return part;
    });
}
