import { type ReactNode, useState } from 'react';
import type { CrewMember } from '../../backend/crew/shipped';
import { MODELS } from '../../shared';
import { type Args, call } from '../api';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Choice } from '../ui/Choice';
import { Confirm } from '../ui/Confirm';
import { Dialog, DialogActions, DialogClose, DialogHead, DialogTitle } from '../ui/Dialog';
import { Input } from '../ui/Field';
import { Switch } from '../ui/Switch';
import { Permissions } from './Permissions';

// The stacked layout of a narrow window in styles.css, where an open legend would cover the camp
const STACKED = '(max-width: 1000px)';
const modelLabel = (m: string) => m[0].toUpperCase() + m.slice(1);
// The strongest model first
const MODEL_OPTIONS = [...MODELS].reverse().map((m) => ({ value: m, label: modelLabel(m) }));

type Definition = Awaited<ReturnType<typeof call<'members.definition'>>> & { id: number };

// What matters at a glance (who, which model, hired or not) shows in the row; everything else opens from it
export function Legend({ members, onMemory }: { members: CrewMember[]; onMemory: (memberId: number) => void }) {
  const [open, setOpen] = useState(() => !matchMedia(STACKED).matches);
  const [shown, setShown] = useState<Definition | null>(null);
  const [resetting, setResetting] = useState(false);
  const current = members.find((m) => m.id === shown?.id);

  function update(m: CrewMember, change: Omit<Args<'members.update'>, 'id'>) {
    call('members.update', { id: m.id, ...change });
  }

  return (
    <div className="legend" data-open={open || undefined}>
      <Button variant="row" className="legend-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        크루 <Badge>{members.filter((m) => m.status === 'hired').length}명 고용</Badge>
        <svg viewBox="0 0 20 20" className="icon legend-chevron" aria-hidden="true">
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      </Button>
      {open && (
        <ul className="legend-list">
          {members.map((m) => (
            <li key={m.id}>
              <Button
                variant="row"
                className="legend-row"
                data-unhired={m.status === 'unhired' || undefined}
                aria-label={`${m.role} 설정`}
                onClick={async () => setShown({ ...(await call('members.definition', { id: m.id })), id: m.id })}
              >
                <span className="hired-dot" aria-hidden="true" />
                <span className="role">{m.role}</span>
                <span className="nick">{m.nickname}</span>
                <span className="model-tag">{m.status === 'hired' ? modelLabel(m.model) : '미고용'}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog open={!!shown} onClose={() => setShown(null)} keepFocus>
        <DialogHead>
          <DialogTitle>{shown?.role}</DialogTitle>
        </DialogHead>
        {current && (
          <div className="member-basics">
            <Nickname member={current} onSave={(nickname) => update(current, { nickname })} />
            <Choice
              label={`${current.role} 모델`}
              value={current.model}
              options={MODEL_OPTIONS}
              onChange={(model) => update(current, { model: model as Args<'members.update'>['model'] })}
            />
            {!current.kept && (
              <label className="hire">
                고용
                <Switch
                  checked={current.status === 'hired'}
                  label={`${current.role} 고용`}
                  onChange={(on) => update(current, { status: on ? 'hired' : 'unhired' })}
                />
              </label>
            )}
          </div>
        )}
        {shown && <Permissions memberId={shown.id} />}
        {/* The instructions are the model's own prompt, kept in English; few people need to read them */}
        <details className="def-fold">
          <summary>지시문</summary>
          <Prose className="def-body" text={shown?.instructions ?? ''} />
        </details>
        <DialogActions>
          <Button className="member-reset" onClick={() => setResetting(true)}>
            초기화
          </Button>
          <Button
            onClick={() => {
              onMemory(shown!.id);
              setShown(null);
            }}
          >
            메모리
          </Button>
          <DialogClose />
        </DialogActions>
        {resetting && current && (
          <Confirm
            label="초기화"
            text="별명, 모델, 고용, 권한을 처음 설정으로 되돌립니다."
            actions={[
              {
                label: '되돌리기',
                danger: true,
                run: async () => {
                  setResetting(false);
                  await call('members.reset', { id: current.id });
                },
              },
            ]}
            onCancel={() => setResetting(false)}
          />
        )}
      </Dialog>
    </div>
  );
}

function Nickname({ member, onSave }: { member: CrewMember; onSave: (n: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const save = () => {
    const next = draft?.trim();
    setDraft(null);
    if (next && next !== member.nickname) onSave(next);
  };
  return (
    <Input
      size="md"
      className="nickname"
      aria-label={`${member.role} 별명`}
      value={draft ?? member.nickname}
      maxLength={12}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur();
        if (e.key === 'Escape') setDraft(null);
      }}
    />
  );
}

// The definition's Markdown read as text: headings, list items, bold, and code, without the marks
function Prose({ text, className }: { text: string; className: string }) {
  const inline = (line: string) =>
    line
      .split(/(\*\*[^*]+\*\*|`[^`]+`)/)
      .map(
        (part, i): ReactNode =>
          part.startsWith('**') ? (
            <b key={i}>{part.slice(2, -2)}</b>
          ) : part.startsWith('`') ? (
            <code key={i}>{part.slice(1, -1)}</code>
          ) : (
            part
          ),
      );
  return (
    <div className={className}>
      {text.split(/\n{2,}/).map((block, i) => {
        const heading = block.match(/^#+ (.*)/);
        if (heading) return <h4 key={i}>{inline(heading[1])}</h4>;
        const lines = block.split('\n');
        if (lines.every((l) => /^\s*[-*] /.test(l)))
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*] /, ''))}</li>
              ))}
            </ul>
          );
        return <p key={i}>{inline(block)}</p>;
      })}
    </div>
  );
}
