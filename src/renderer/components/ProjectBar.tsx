import * as Select from '@radix-ui/react-select';
import type { Project, Session } from '../../main/db';

const OPEN = 'open';
const NEW = 'new';
const TREE = 'tree';
const FLOW = 'workflow';

type Props = {
  projects: Project[];
  project: Project | null;
  sessions: Session[];
  session: Session | null;
  onProject: (p: Project) => void;
  onOpenFolder: () => void;
  onSession: (s: Session) => void;
  onNewSession: () => void;
  onTree: () => void;
  onWorkflow: () => void;
};

export function sessionLabel(s: Session) {
  return `세션 ${String(s.number).padStart(2, '0')}`;
}

export function ProjectBar(props: Props) {
  const { projects, project, sessions, session } = props;
  return (
    <div className="project-bar">
      <Select.Root
        value={project ? String(project.id) : ''}
        onValueChange={(v) => (v === OPEN ? props.onOpenFolder() : v === TREE ? props.onTree() : v === FLOW ? props.onWorkflow() : props.onProject(projects.find((p) => String(p.id) === v)!))}
      >
        <Select.Trigger className="picker project-picker" aria-label="프로젝트">
          <FolderIcon />
          <span className="muted">프로젝트</span>
          <span className="muted">/</span>
          <span className="picker-value">{project?.name ?? '폴더 열기'}</span>
          <Chevron />
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="menu" position="popper" sideOffset={4}>
            <Select.Viewport>
              {projects.map((p) => (
                <Select.Item key={p.id} value={String(p.id)} className="menu-item" title={p.path}>
                  <Select.ItemText>{p.name}</Select.ItemText>
                </Select.Item>
              ))}
              <Select.Item value={OPEN} className="menu-item action">
                <Select.ItemText>폴더 열기…</Select.ItemText>
              </Select.Item>
              {project && (
                <Select.Item value={FLOW} className="menu-item action">
                  <Select.ItemText>워크플로우 편집…</Select.ItemText>
                </Select.Item>
              )}
              <Select.Item value={TREE} className="menu-item action">
                <Select.ItemText>프로젝트 트리…</Select.ItemText>
              </Select.Item>
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <Select.Root
        value={session ? String(session.id) : ''}
        disabled={!project}
        onValueChange={(v) => (v === NEW ? props.onNewSession() : props.onSession(sessions.find((s) => String(s.id) === v)!))}
      >
        <Select.Trigger className="picker session-picker" aria-label="세션">
          <span className="picker-value">{session ? sessionLabel(session) : '세션'}</span>
          <Chevron />
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="menu" position="popper" sideOffset={4} align="end">
            <Select.Viewport>
              {sessions.map((s) => (
                <Select.Item key={s.id} value={String(s.id)} className="menu-item">
                  <Select.ItemText>{sessionLabel(s)}</Select.ItemText>
                </Select.Item>
              ))}
              <Select.Item value={NEW} className="menu-item action">
                <Select.ItemText>새 세션</Select.ItemText>
              </Select.Item>
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 20 20" className="icon" aria-hidden="true">
      <path d="M2 5.5A1.5 1.5 0 0 1 3.5 4h4l2 2h7A1.5 1.5 0 0 1 18 7.5v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 14.5z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 20 20" className="icon chevron" aria-hidden="true">
      <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
