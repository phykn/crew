import { useState } from 'react';
import * as Select from '@radix-ui/react-select';
import * as Switch from '@radix-ui/react-switch';
import * as Dialog from '@radix-ui/react-dialog';
import type { CrewMember } from '../../main/crew';
import { call } from '../api';
import { KitIcon } from './Icons';
import { Permissions } from './Permissions';

const MODEL_LABELS: Record<string, string> = { haiku: 'Haiku', sonnet: 'Sonnet', opus: 'Opus' };

type Definition = Awaited<ReturnType<typeof call<'members.definition'>>> & { id: number };

export function Legend({ members, onChange, onMemory }: { members: CrewMember[]; onChange: () => void; onMemory: (memberId: number) => void }) {
  const [open, setOpen] = useState(true);
  const [shown, setShown] = useState<Definition | null>(null);

  async function update(m: CrewMember, change: { nickname?: string; model?: string; status?: 'hired' | 'unhired' }) {
    await call('members.update', { id: m.id, ...change });
    onChange();
  }

  return (
    <div className="legend" data-open={open || undefined}>
      <button className="legend-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <svg viewBox="0 0 20 20" className="icon legend-chevron" aria-hidden="true">
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        크루
      </button>
      {open && (
        <table className="legend-table">
          <thead>
            <tr>
              <th />
              <th>역할</th>
              <th>별명</th>
              <th colSpan={3} />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} data-unhired={m.status === 'unhired' || undefined} aria-label={m.role}>
                <td>
                  <Switch.Root
                    className="switch"
                    checked={m.status === 'hired'}
                    disabled={m.kept}
                    aria-label={`${m.role} 고용`}
                    title={m.kept ? '크루 운영에 꼭 필요한 역할입니다' : undefined}
                    onCheckedChange={(on) => update(m, { status: on ? 'hired' : 'unhired' })}
                  >
                    <Switch.Thumb className="switch-thumb" />
                  </Switch.Root>
                </td>
                <td className="role" style={{ color: m.color }}>
                  {m.role}
                </td>
                <td>
                  <Nickname member={m} onSave={(nickname) => update(m, { nickname })} />
                </td>
                {m.status === 'hired' ? (
                  <>
                    <td>
                      <ModelPicker value={m.model} role={m.role} onChange={(model) => update(m, { model })} />
                    </td>
                    <td>
                      <button
                        className="md"
                        aria-label={`${m.role} 정의`}
                        onClick={async () => setShown({ ...(await call('members.definition', { id: m.id })), id: m.id })}
                      >
                        MD
                      </button>
                    </td>
                    <td className="kit">
                      {m.skills.map((s) => (
                        <KitIcon key={s.name} icon={s.icon} label={s.label} />
                      ))}
                    </td>
                  </>
                ) : (
                  <>
                    <td className="muted unhired-label">미고용</td>
                    <td colSpan={2}>
                      <button className="rehire" onClick={() => update(m, { status: 'hired' })}>
                        재고용
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Dialog.Root open={!!shown} onOpenChange={(o) => !o && setShown(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay" />
          <Dialog.Content className="dialog">
            <Dialog.Title>{shown?.role} 정의</Dialog.Title>
            <Dialog.Description className="muted">{shown?.description}</Dialog.Description>
            {shown && <Permissions memberId={shown.id} onChange={onChange} />}
            <pre className="def-body">{shown?.instructions}</pre>
            <div className="dialog-actions">
              <button
                className="button"
                onClick={() => {
                  onMemory(shown!.id);
                  setShown(null);
                }}
              >
                메모리 보기
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

function ModelPicker({ value, role, onChange }: { value: string; role: string; onChange: (m: string) => void }) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="model" aria-label={`${role} 모델`}>
        <Select.Value />
        <svg viewBox="0 0 20 20" className="icon chevron" aria-hidden="true">
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="menu" position="popper" sideOffset={4}>
          <Select.Viewport>
            {Object.entries(MODEL_LABELS).map(([k, label]) => (
              <Select.Item key={k} value={k} className="menu-item">
                <Select.ItemText>{label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
