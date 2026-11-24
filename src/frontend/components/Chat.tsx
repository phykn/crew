import { useEffect, useRef, useState } from 'react';
import type { Message, Question, Session, Task } from '../../backend/domain/records';
import { IMAGE_TYPES, type Image, imageUrl, type Mode } from '../../shared';
import { answerLabel, modeLabels, say } from '../locale';
import { call, onChanged, onStream } from '../api';
import { Button } from '../ui/Button';
import { Choice } from '../ui/Choice';
import { FileInput, TextArea } from '../ui/Field';
import { ListMenu, ListOption } from '../ui/Menu';
import type { ChangesTarget } from './Changes';
import { TaskCards } from './TaskCards';
import { type Key, t } from '../lang';

// The window's own commands: typed after a slash, they act here and never reach 통역
// A label only where the name alone does not say it
type Command = { name: string; label?: string; run: () => void };
// What each approval mode lets a member do without asking
const MODE_HINTS: Record<Mode, Key> = {
  manual: 'mode.manual.hint',
  auto: 'mode.auto.hint',
  bypass: 'mode.bypass.hint',
};
// A message held back until 통역 is done answering
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
  onChanges,
  commands,
}: {
  session: Session;
  mode: Mode;
  onMode: (m: Mode) => void;
  onWaiting: (waiting: boolean) => void;
  onLog: (taskId: number) => void;
  onChanges: (target: ChangesTarget) => void;
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

  // Once 통역 is done, the oldest held message goes; its answer holds the rest until it is done too
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
      setNotice(t('chat.sendFailed'));
    });
  }

  function sendQueued(q: Queued) {
    setQueued((qs) => qs.filter((x) => x.id !== q.id));
    dispatch(q.text, q.images);
  }

  // Now joins 통역's answer at once; later waits in line while 통역 is answering
  // A card pushed up by a long conversation comes back into view with its first option ready to pick
  function showQuestion(id: number) {
    const card = document.querySelector<HTMLElement>(`[data-question="${id}"]`);
    card?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    card?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true });
  }

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
        ? t('chat.badImages', {
            left,
            mb: MAX_IMAGE_BYTES / 1024 / 1024,
            max: MAX_IMAGES,
          })
        : null,
    );
  }

  return (
    <div className="chat">
      <TaskCards tasks={tasks} messages={messages} onLog={onLog} onAnswer={showQuestion} />
      <div
        className="messages"
        aria-label={t('tab.chat')}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX;
        }}
      >
        {messages.map((m) => (
          <Bubble
            key={m.id}
            author={m.author}
            text={m.say ? say(m.say) : m.text}
            pictures={Array.from({ length: m.imageCount }, (_, n) => imageUrl(m.id, n, m.createdAt))}
            question={m.question}
          >
            {m.taskId && (
              <ReportFiles
                taskId={m.taskId}
                title={tasks.find((t) => t.id === m.taskId)?.title ?? ''}
                onChanges={onChanges}
              />
            )}
          </Bubble>
        ))}
        {streaming !== null && <Bubble author="secretary" text={streaming} pending />}
        {queued
          .filter((q) => q.sessionId === session.id)
          .map((q) => (
            <div key={q.id} className="message user queued" aria-label={t('chat.queued')}>
              <div className="bubble">
                <Pictures srcs={q.images.map(src)} />
                {q.text}
              </div>
              <Button variant="link" tone="muted" size="sm" onClick={() => sendQueued(q)}>
                {t('chat.sendNow')}
              </Button>
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
          <ul className="attachments" aria-label={t('chat.attached')}>
            {images.map((img, n) => (
              <li key={n}>
                <img src={src(img)} alt={t('chat.picture', { n: n + 1 })} />
                <Button
                  size="sm"
                  iconOnly
                  className="attachment-remove"
                  aria-label={t('chat.removePicture', { n: n + 1 })}
                  onClick={() => setImages((have) => have.filter((_, k) => k !== n))}
                >
                  ×
                </Button>
              </li>
            ))}
          </ul>
        )}
        {picked && (
          <ListMenu label={t('chat.commands')} className="slash-menu">
            {matches.map((m) => (
              <ListOption
                key={m.name}
                selected={m === picked}
                onPick={() => {
                  setDraft('');
                  m.run();
                }}
              >
                <b>/{m.name}</b> {m.label && <span className="muted">{m.label}</span>}
              </ListOption>
            ))}
          </ListMenu>
        )}
        <TextArea
          bare
          className="composer-text"
          value={draft}
          placeholder={streaming !== null ? t('chat.queueHint') : t('chat.placeholder')}
          aria-label={t('chat.message')}
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
        {/* Under the words, one row: attach on the left, the mode and send on the right */}
        <div className="composer-tools">
          <Button
            variant="quiet"
            size="lg"
            iconOnly
            aria-label={t('chat.attach')}
            title={t('chat.attach')}
            disabled={images.length >= MAX_IMAGES}
            onClick={() => picker.current?.click()}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Button>
          <FileInput
            ref={picker}
            accept={IMAGE_TYPES.join(',')}
            multiple
            aria-label={t('chat.pictureFile')}
            onChange={(e) => {
              void attach(e.target.files ?? []);
              e.target.value = '';
            }}
          />
          <span className="composer-send">
            <Choice
              label={t('chat.mode')}
              size="lg"
              value={mode}
              options={Object.entries(modeLabels()).map(([value, label]) => ({
                value,
                label,
                hint: t(MODE_HINTS[value as Mode]),
              }))}
              onChange={(m) => onMode(m as Mode)}
            />
            {streaming !== null ? (
              <Button
                variant="primary"
                tone="danger"
                size="lg"
                iconOnly
                aria-label={t('chat.stop')}
                onClick={() => call('messages.stop', { sessionId: session.id })}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <rect x="5" y="5" width="10" height="10" rx="1.5" fill="currentColor" />
                </svg>
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="lg"
                iconOnly
                aria-label={t('chat.send')}
                disabled={!draft.trim() && !images.length}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M3 3l15 7-15 7 2.5-7z" fill="currentColor" />
                </svg>
              </Button>
            )}
          </span>
        </div>
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
  children?: React.ReactNode;
};

function Pictures({ srcs }: { srcs: string[] }) {
  if (!srcs.length) return null;
  return (
    <div className="pictures">
      {srcs.map((s, n) => (
        <img key={n} src={s} alt={t('chat.sentPicture', { n: n + 1 })} loading="lazy" />
      ))}
    </div>
  );
}

function Bubble({ author, text, pictures = [], pending, question, children }: BubbleProps) {
  // Only two people talk here, so the side a bubble sits on says who said it: me right, 통역 left
  return (
    <div
      className={`message ${author}`}
      data-pending={pending || undefined}
      aria-label={author === 'user' ? t('chat.me') : t('chat.interpreter')}
    >
      {question ? (
        <AnswerCard question={question} />
      ) : (
        <div className="bubble">
          <Pictures srcs={pictures} />
          {text ? renderInline(text) : pending ? <span className="typing">···</span> : ''}
          {children}
        </div>
      )}
    </div>
  );
}

// Under a finished task's report: the files its last kept version changed, each opening its diff
function ReportFiles({
  taskId,
  title,
  onChanges,
}: {
  taskId: number;
  title: string;
  onChanges: (target: ChangesTarget) => void;
}) {
  const [last, setLast] = useState<{ id: number; files: string[] } | null>(null);
  useEffect(() => {
    let live = true;
    void call('tasks.versions', { id: taskId }).then((vs) => live && setLast(vs.at(-1) ?? null));
    return () => {
      live = false;
    };
  }, [taskId]);
  if (!last?.files.length) return null;
  return (
    <div className="report-files">
      <span className="muted">{t('diff.files')}</span>
      {last.files.map((file) => (
        <Button
          key={file}
          variant="link"
          title={t('diff.show')}
          onClick={() => onChanges({ taskId, title, versionId: last.id, file })}
        >
          {file}
        </Button>
      ))}
    </div>
  );
}

function AnswerCard({ question }: { question: Question }) {
  // The pick shows at once, before the record comes back with it
  const [picked, setPicked] = useState<string | null>(null);
  const answer = question.answer ?? picked;
  return (
    <div className="answer-card" data-question={question.id} data-answered={answer !== null || undefined}>
      <div className="answer-prompt">{renderInline(say(question.say))}</div>
      {answer !== null ? (
        <p className="answer-result" role="status">
          ✓ {answerLabel(answer)}
        </p>
      ) : (
        <div className="answer-options">
          {question.options.map((o, i) => (
            <Button
              key={o}
              size="lg"
              className="answer-option"
              variant={i === question.options.length - 1 ? 'primary' : 'secondary'}
              onClick={() => {
                setPicked(o);
                // A pick the record refused shows the options again
                call('questions.answer', { id: question.id, choice: o }).catch(() => setPicked(null));
              }}
            >
              {answerLabel(o)}
            </Button>
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
