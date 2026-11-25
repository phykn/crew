import { type ReactNode, useEffect, useState } from 'react';
import type { CrewMember } from '../../backend/domain/crew';
import { MODELS } from '../../shared';
import { type Args, call } from '../api';
import { Fold } from '../ui/Fold';
import { Label } from '../ui/Field';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Choice } from '../ui/Choice';
import { Confirm } from '../ui/Confirm';
import { Dialog, DialogActions, DialogClose, DialogHead, DialogTitle } from '../ui/Dialog';
import { Input } from '../ui/Field';
import { Switch } from '../ui/Switch';
import { Permissions } from './Permissions';
import { t } from '../lang';
import { modelLabel } from '../locale';

// The stacked layout of a narrow window in styles.css, where an open legend would cover the camp
const STACKED = '(max-width: 1000px)';
// The strongest model first
const MODEL_OPTIONS = [...MODELS].reverse().map((m) => ({ value: m, label: modelLabel(m) }));

type Definition = Awaited<ReturnType<typeof call<'members.definition'>>> & { id: number };

// What matters at a glance (who, which model, hired or not) shows in the row; everything else opens from it
export function Legend({ members, onMemory }: { members: CrewMember[]; onMemory: (memberId: number) => void }) {
  const [open, setOpen] = useState(() => !matchMedia(STACKED).matches);
  useEffect(() => {
    const stacked = matchMedia(STACKED);
    const follow = () => setOpen(!stacked.matches);
    stacked.addEventListener('change', follow);
    return () => stacked.removeEventListener('change', follow);
  }, []);
  const [shown, setShown] = useState<Definition | null>(null);
  const [resetting, setResetting] = useState(false);
  const current = members.find((m) => m.id === shown?.id);

  function update(m: CrewMember, change: Omit<Args<'members.update'>, 'id'>) {
    call('members.update', { id: m.id, ...change });
  }

  return (
    <div className="legend">
      <Fold
        size="lg"
        label={
          <>
            {t('legend.crew')}{' '}
            <Badge>{t('legend.hired', { n: members.filter((m) => m.status === 'hired').length })}</Badge>
          </>
        }
        open={open}
        onOpenChange={setOpen}
      >
        <ul className="legend-list">
          {members.map((m) => (
            <li key={m.id}>
              <Button
                variant="row"
                size="md"
                tone={m.status === 'unhired' ? 'muted' : undefined}
                className="legend-row"
                data-unhired={m.status === 'unhired' || undefined}
                aria-label={t('legend.settings', { role: m.role })}
                onClick={async () => setShown({ ...(await call('members.definition', { id: m.id })), id: m.id })}
              >
                <span className="hired-dot" aria-hidden="true" />
                <span className="role">{m.role}</span>
                <span className="nick">{m.nickname}</span>
                <span className="model-tag">{m.status === 'hired' ? modelLabel(m.model) : t('legend.unhired')}</span>
              </Button>
            </li>
          ))}
        </ul>
      </Fold>
      <Dialog open={!!shown} onClose={() => setShown(null)} keepFocus>
        <DialogHead>
          <DialogTitle>{shown?.role}</DialogTitle>
        </DialogHead>
        {current && (
          <div className="member-basics">
            <Nickname member={current} onSave={(nickname) => update(current, { nickname })} />
            <Choice
              label={t('legend.model', { role: current.role })}
              value={current.model}
              options={MODEL_OPTIONS}
              onChange={(model) => update(current, { model: model as Args<'members.update'>['model'] })}
            />
            {!current.kept && (
              <Label inline text={t('legend.hire')} className="hire">
                <Switch
                  checked={current.status === 'hired'}
                  label={t('legend.hireRole', { role: current.role })}
                  onChange={(on) => update(current, { status: on ? 'hired' : 'unhired' })}
                />
              </Label>
            )}
          </div>
        )}
        {shown && <Permissions memberId={shown.id} />}
        {/* The instructions are the model's own prompt, kept in English; few people need to read them */}
        <Fold label={t('legend.instructions')} className="def-fold">
          <Prose className="def-body" text={shown?.instructions ?? ''} />
        </Fold>
        <DialogActions>
          <Button className="member-reset" onClick={() => setResetting(true)}>
            {t('legend.reset')}
          </Button>
          <Button
            onClick={() => {
              onMemory(shown!.id);
              setShown(null);
            }}
          >
            {t('tab.memory')}
          </Button>
          <DialogClose />
        </DialogActions>
        {resetting && current && (
          <Confirm
            label={t('legend.reset')}
            text={t('legend.resetText')}
            actions={[
              {
                label: t('legend.resetDo'),
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
      aria-label={t('legend.nickname', { role: member.role })}
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
