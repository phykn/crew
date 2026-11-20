import * as Select from '@radix-ui/react-select';
import type { ListedProject, Project, Session } from '../../backend/db';
import { clock } from '../time';
import { Chevron, ExplorerIcon, FolderIcon } from './Icons';

const OPEN = 'open';
const NEW = 'new';

type Props = {
  projects: ListedProject[];
  project: Project | null;
  sessions: Session[];
  session: Session | null;
  onProject: (p: Project) => void;
  onOpenFolder: () => void;
  onOpenList: () => void;
  onSession: (s: Session) => void;
  onNewSession: () => void;
  onExplorer: () => void;
};

// Named after the first thing asked in it; until then, by when it was opened
export function sessionLabel(s: Session) {
  if (s.title) return s.title;
  const d = new Date(s.createdAt);
  return `새 대화 ${d.getMonth() + 1}/${d.getDate()} ${clock(s.createdAt)}`;
}

export function ProjectBar(props: Props) {
  const { projects, project, sessions, session } = props;
  const others = sessions.filter((s) => s.id !== session?.id);
  return (
    <div className="project-bar">
      <Select.Root
        value={project ? String(project.id) : ''}
        onOpenChange={(o) => o && props.onOpenList()}
        onValueChange={(v) =>
          v === OPEN ? props.onOpenFolder() : props.onProject(projects.find((p) => String(p.id) === v)!)
        }
      >
        <Select.Trigger className="picker project-picker" aria-label="프로젝트">
          <FolderIcon />
          <span className="picker-value">{project?.name ?? '폴더 열기'}</span>
          <Chevron />
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="menu" position="popper" sideOffset={4}>
            <Select.Viewport>
              {/* The open one is already on the button, so the menu lists only where else to go */}
              {projects
                .filter((p) => p.id !== project?.id)
                .map((p) => (
                  <Select.Item
                    key={p.id}
                    value={String(p.id)}
                    className="menu-item"
                    title={p.path}
                    disabled={p.missing}
                  >
                    <Select.ItemText>{p.name}</Select.ItemText>
                    {p.missing && <span className="badge missing">폴더 없음</span>}
                  </Select.Item>
                ))}
              <Select.Item value={OPEN} className="menu-item action">
                <Select.ItemText>폴더 열기…</Select.ItemText>
              </Select.Item>
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <Select.Root
        value={session ? String(session.id) : ''}
        disabled={!project}
        onValueChange={(v) =>
          v === NEW ? props.onNewSession() : props.onSession(sessions.find((s) => String(s.id) === v)!)
        }
      >
        <Select.Trigger className="picker session-picker" aria-label="세션">
          <span className="picker-value">{session ? sessionLabel(session) : '세션'}</span>
          <Chevron />
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="menu" position="popper" sideOffset={4} align="end">
            <Select.Viewport>
              {others.map((s) => (
                <Select.Item key={s.id} value={String(s.id)} className="menu-item">
                  <Select.ItemText>{sessionLabel(s)}</Select.ItemText>
                </Select.Item>
              ))}
              {others.length > 0 && <Select.Separator className="menu-separator" />}
              <Select.Item value={NEW} className="menu-item action">
                <Select.ItemText>새 세션</Select.ItemText>
              </Select.Item>
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      {/* Folders and sessions both, so it sits beside the two pickers rather than in either; it also clears projects whose folder is gone */}
      <button className="picker explorer-button" aria-label="탐색기" title="탐색기" onClick={props.onExplorer}>
        <ExplorerIcon />
      </button>
    </div>
  );
}
