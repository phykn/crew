import { type ReactNode, useState } from "react";
import * as Switch from "@radix-ui/react-switch";
import * as Dialog from "@radix-ui/react-dialog";
import type { CrewMember } from "../../backend/crew/shipped";
import { MODELS } from "../../shared";
import { type Args, call } from "../api";
import { Choice } from "./Choice";
import { Permissions } from "./Permissions";

// The stacked layout of a narrow window in styles.css, where an open legend would cover the camp
const STACKED = "(max-width: 1000px)";
const modelLabel = (m: string) => m[0].toUpperCase() + m.slice(1);
// The strongest model first
const MODEL_OPTIONS = [...MODELS]
  .reverse()
  .map((m) => ({ value: m, label: modelLabel(m) }));

type Definition = Awaited<ReturnType<typeof call<"members.definition">>> & {
  id: number;
};

// What matters at a glance (who, which model, hired or not) shows in the row; everything else opens from it
export function Legend({
  members,
  onMemory,
}: {
  members: CrewMember[];
  onMemory: (memberId: number) => void;
}) {
  const [open, setOpen] = useState(() => !matchMedia(STACKED).matches);
  const [shown, setShown] = useState<Definition | null>(null);
  const current = members.find((m) => m.id === shown?.id);

  function update(m: CrewMember, change: Omit<Args<"members.update">, "id">) {
    call("members.update", { id: m.id, ...change });
  }

  return (
    <div className="legend" data-open={open || undefined}>
      <button
        className="legend-head"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        크루{" "}
        <span className="badge">
          {members.filter((m) => m.status === "hired").length}명 고용
        </span>
        <svg
          viewBox="0 0 20 20"
          className="icon legend-chevron"
          aria-hidden="true"
        >
          <path
            d="M5 8l5 5 5-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          />
        </svg>
      </button>
      {open && (
        <ul className="legend-list">
          {members.map((m) => (
            <li key={m.id}>
              <button
                className="legend-row"
                data-unhired={m.status === "unhired" || undefined}
                aria-label={`${m.role} 설정`}
                onClick={async () =>
                  setShown({
                    ...(await call("members.definition", { id: m.id })),
                    id: m.id,
                  })
                }
              >
                <span className="hired-dot" aria-hidden="true" />
                <span className="role">{m.role}</span>
                <span className="nick">{m.nickname}</span>
                <span className="model-tag">
                  {m.status === "hired" ? modelLabel(m.model) : "미고용"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <Dialog.Root open={!!shown} onOpenChange={(o) => !o && setShown(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay" />
          {/* No field takes focus on open, so a stray key cannot overwrite the nickname */}
          <Dialog.Content
            className="dialog"
            aria-describedby={undefined}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Dialog.Title>{shown?.role}</Dialog.Title>
            {current && (
              <div className="member-basics">
                <Nickname
                  member={current}
                  onSave={(nickname) => update(current, { nickname })}
                />
                <Choice
                  label={`${current.role} 모델`}
                  value={current.model}
                  options={MODEL_OPTIONS}
                  onChange={(model) =>
                    update(current, {
                      model: model as Args<"members.update">["model"],
                    })
                  }
                />
                {!current.kept && (
                  <label className="hire">
                    고용
                    <Switch.Root
                      className="switch"
                      checked={current.status === "hired"}
                      aria-label={`${current.role} 고용`}
                      onCheckedChange={(on) =>
                        update(current, { status: on ? "hired" : "unhired" })
                      }
                    >
                      <Switch.Thumb className="switch-thumb" />
                    </Switch.Root>
                  </label>
                )}
              </div>
            )}
            {shown && <Permissions memberId={shown.id} />}
            {/* The instructions are the model's own prompt, kept in English; few people need to read them */}
            <details className="def-fold">
              <summary>지시문</summary>
              <Prose className="def-body" text={shown?.instructions ?? ""} />
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

function Nickname({
  member,
  onSave,
}: {
  member: CrewMember;
  onSave: (n: string) => void;
}) {
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
        if (e.key === "Enter" && !e.nativeEvent.isComposing)
          e.currentTarget.blur();
        if (e.key === "Escape") setDraft(null);
      }}
    />
  );
}

// The definition's Markdown read as text: headings, list items, bold, and code, without the marks
function Prose({ text, className }: { text: string; className: string }) {
  const inline = (line: string) =>
    line
      .split(/(\*\*[^*]+\*\*|`[^`]+`)/)
      .map((part, i): ReactNode =>
        part.startsWith("**") ? (
          <b key={i}>{part.slice(2, -2)}</b>
        ) : part.startsWith("`") ? (
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
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-*] /.test(l)))
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*] /, ""))}</li>
              ))}
            </ul>
          );
        return <p key={i}>{inline(block)}</p>;
      })}
    </div>
  );
}
