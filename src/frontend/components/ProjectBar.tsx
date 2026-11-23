import * as Select from '@radix-ui/react-select';
import type { ListedProject, Project, Session } from '../../backend/domain/records';
import { clock } from '../time';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ChoiceTrigger, ChoiceValue } from '../ui/Choice';
import { SelectItem, SelectMenu, SelectSeparator } from '../ui/Menu';
import { ExplorerIcon, FolderIcon } from './Icons';

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
        <ChoiceTrigger label="프로젝트" size="lg" className="project-picker">
          <FolderIcon />
          {/* The value is the title of what is open */}
          <ChoiceValue>
            <b>{project?.name ?? '폴더 열기'}</b>
          </ChoiceValue>
        </ChoiceTrigger>
        <SelectMenu>
          {/* The open one is already on the button, so the menu lists only where else to go */}
          {projects
            .filter((p) => p.id !== project?.id)
            .map((p) => (
              <SelectItem
                key={p.id}
                value={String(p.id)}
                title={p.path}
                disabled={p.missing}
                aside={p.missing && <Badge tone="bad">폴더 없음</Badge>}
              >
                {p.name}
              </SelectItem>
            ))}
          <SelectItem value={OPEN} action>
            폴더 열기…
          </SelectItem>
        </SelectMenu>
      </Select.Root>
      <Select.Root
        value={session ? String(session.id) : ''}
        disabled={!project}
        onValueChange={(v) =>
          v === NEW ? props.onNewSession() : props.onSession(sessions.find((s) => String(s.id) === v)!)
        }
      >
        <ChoiceTrigger label="세션" size="lg" className="session-picker">
          <ChoiceValue>
            <b>{session ? sessionLabel(session) : '세션'}</b>
          </ChoiceValue>
        </ChoiceTrigger>
        <SelectMenu align="end">
          {others.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              {sessionLabel(s)}
            </SelectItem>
          ))}
          {others.length > 0 && <SelectSeparator />}
          <SelectItem value={NEW} action>
            새 세션
          </SelectItem>
        </SelectMenu>
      </Select.Root>
      {/* Folders and sessions both, so it sits beside the two pickers rather than in either; it also clears projects whose folder is gone */}
      <Button size="lg" iconOnly aria-label="탐색기" title="탐색기" onClick={props.onExplorer}>
        <ExplorerIcon />
      </Button>
    </div>
  );
}
