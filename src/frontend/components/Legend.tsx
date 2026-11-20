import { useState } from 'react';
import * as Switch from '@radix-ui/react-switch';
import * as Dialog from '@radix-ui/react-dialog';
import type { CrewMember } from '../../backend/crew/shipped';
import { type Args, call } from '../api';
import { Choice } from './Choice';
import { Permissions } from './Permissions';

const MODELS = [
  { value: 'opus', label: 'Opus' },
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'haiku', label: 'Haiku' },
];
const modelLabel = (m: string) => MODELS.find((x) => x.value === m)?.label ?? m;

type Definition = Awaited<ReturnType<typeof call<'members.definition'>>> & { id: number };

// What matters at a glance (who, which model, hired or not) shows in the row; everything else opens from it
export function Legend({
  members,
  onChange,
  onMemory,
}: {
  members: CrewMember[];
  onChange: () => void;
  onMemory: (memberId: number) => void;
}) {
  const [open, setOpen] = useState(true);
  const [shown, setShown] = useState<Definition | null>(null);
  const current = members.find((m) => m.id === shown?.id);

  async function update(m: CrewMember, change: Omit<Args<'members.update'>, 'id'>) {
    await call('members.update', { id: m.id, ...change });
    onChange();
  }

  return (
    <div className="legend" data-open={open || undefined}>
      <button className="legend-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        크루 · {members.filter((m) => m.status === 'hired').length}명 고용 중
        <svg viewBox="0 0 20 20" className="icon legend-chevron" aria-hidden="true">
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      </button>
      {open && (
        <ul className="legend-list">
          {members.map((m) => (
            <li key={m.id}>
              <button
                className="legend-row"
                data-unhired={m.status === 'unhired' || undefined}
                aria-label={`${m.role} 설정`}
                onClick={async () => setShown({ ...(await call('members.definition', { id: m.id })), id: m.id })}
              >
                <span className="hired-dot" aria-hidden="true" />
                <span className="role">{m.role}</span>
                <span className="nick">{m.nickname}</span>
                <span className="model-tag">{m.status === 'hired' ? modelLabel(m.model) : '미고용'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Dialog.Root open={!!shown} onOpenChange={(o) => !o && setShown(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay" />
          {/* No field takes focus on open, so a stray key cannot overwrite the nickname */}
          <Dialog.Content className="dialog" aria-describedby={undefined} onOpenAutoFocus={(e) => e.preventDefault()}>
            <Dialog.Title>{shown?.role}</Dialog.Title>
            {current && (
              <div className="member-basics">
                <Nickname member={current} onSave={(nickname) => update(current, { nickname })} />
                <Choice
                  label={`${current.role} 모델`}
                  value={current.model}
                  options={MODELS}
                  onChange={(model) => update(current, { model: model as Args<'members.update'>['model'] })}
                />
                {!current.kept && (
                  <label className="hire">
                    고용
                    <Switch.Root
                      className="switch"
                      checked={current.status === 'hired'}
                      aria-label={`${current.role} 고용`}
                      onCheckedChange={(on) => update(current, { status: on ? 'hired' : 'unhired' })}
                    >
                      <Switch.Thumb className="switch-thumb" />
                    </Switch.Root>
                  </label>
                )}
              </div>
            )}
            {shown && <Permissions memberId={shown.id} onChange={onChange} />}
            {/* The instructions are the model's own prompt, kept in English; few people need to read them */}
            <details className="def-fold">
              <summary>지시문</summary>
              <pre className="def-body">{shown?.instructions}</pre>
            </details>
            <div className="dialog-actions">
              <button
                className="button"
                onClick={() => {
                  onMemory(shown!.id);
                  setShown(null);
                }}
              >
                메모리
              </button>
              <Dialog.Close className="button">닫기</Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
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
    <input
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
