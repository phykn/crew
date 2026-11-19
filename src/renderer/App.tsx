import { useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import type { Project, Session } from '../main/db';
import type { CrewMember } from '../main/crew';
import { call, onChanged, onNavigate } from './api';
import { TitleBar } from './components/TitleBar';
import { ProjectBar } from './components/ProjectBar';
import { Chat } from './components/Chat';
import { Legend } from './components/Legend';
import { Log } from './components/Log';
import { ProjectTree } from './components/ProjectTree';
import { Memory } from './components/Memory';
import { WorkflowView } from './components/WorkflowView';
import { Camp } from './components/Camp';

export function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [tab, setTab] = useState('chat');
  const [tree, setTree] = useState(false);
  // The member whose memory the memory tab shows; null shows everyone's
  const [memoryOf, setMemoryOf] = useState<number | null>(null);
  // The workflow kind the workflow tab shows
  const [kind, setKind] = useState('code');

  // Hires made through 비서 reach the legend and the camp; a session named by its first message shows its name
  useEffect(() => {
    if (!project) return;
    return onChanged(async (t) => {
      if (t === 'members') setMembers(await call('members.list', { projectId: project.id }));
      if (t === 'sessions') {
        const list = await call('sessions.list', { projectId: project.id });
        setSessions(list);
        setSession((s) => list.find((x) => x.id === s?.id) ?? s);
      }
    });
  }, [project?.id]);

  // 도우미 moves the window the way the user would by clicking
  useEffect(
    () =>
      onNavigate((ev) => {
        if (ev.sessionId !== session?.id) return;
        if (ev.view === 'log') {
          setLogTask(ev.taskId ?? null);
          setTab('log');
        } else if (ev.view === 'wiki') setTab('memory');
        else {
          setKind(ev.kind ?? 'code');
          setTab('workflow');
        }
      }),
    [session?.id],
  );
  // The task the log shows; null shows every task in the session
  const [logTask, setLogTask] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const [list, last] = await Promise.all([call('projects.list'), call('last.read')]);
      setProjects(list);
      const picked = list.find((p) => p.id === last.projectId) ?? list[0];
      if (picked) await selectProject(picked, last.sessionId);
    })();
  }, []);

  async function selectProject(p: Project, sessionId?: number) {
    let list = await call('sessions.list', { projectId: p.id });
    // A project always has a session to talk in
    if (list.length === 0) list = [await call('sessions.create', { projectId: p.id })];
    setProject(p);
    setSessions(list);
    setMembers(await call('members.list', { projectId: p.id }));
    selectSession(list.find((s) => s.id === sessionId) ?? list[0], p);
  }

  function selectSession(s: Session, p = project!) {
    setSession(s);
    call('last.write', { projectId: p.id, sessionId: s.id });
  }

  async function openFolder() {
    const p = await call('projects.open');
    if (!p) return;
    setProjects(await call('projects.list'));
    await selectProject(p);
  }

  // After a removal the window falls back to what is left, or to an empty start
  async function afterDelete() {
    const list = await call('projects.list');
    setProjects(list);
    const still = list.find((p) => p.id === project?.id) ?? list[0];
    if (still) await selectProject(still, session?.id);
    else {
      setProject(null);
      setSessions([]);
      setSession(null);
      setMembers([]);
    }
  }

  async function clearSession() {
    const s = await call('sessions.clear', { sessionId: session!.id });
    setSessions(await call('sessions.list', { projectId: project!.id }));
    selectSession(s);
  }

  async function newSession() {
    const s = await call('sessions.create', { projectId: project!.id });
    setSessions(await call('sessions.list', { projectId: project!.id }));
    selectSession(s);
  }

  return (
    <div className="app">
      <TitleBar />
      <ProjectTree open={tree} onClose={() => setTree(false)} onDeleted={afterDelete} />
      <main className="body">
        <section className="camp" aria-label="캠프">
          <Camp
            members={members}
            session={session}
            onPick={(taskId) => {
              setLogTask(taskId);
              setTab('log');
            }}
          />
          {project && (
            <Legend
              members={members}
              onChange={async () => setMembers(await call('members.list', { projectId: project.id }))}
              onMemory={(id) => {
                setMemoryOf(id);
                setTab('memory');
              }}
            />
          )}
        </section>
        <aside className="panel">
          <ProjectBar
            projects={projects}
            project={project}
            sessions={sessions}
            session={session}
            onProject={(p) => selectProject(p)}
            onOpenFolder={openFolder}
            onSession={(s) => selectSession(s)}
            onNewSession={newSession}
            onExplorer={() => setTree(true)}
          />
          <Tabs.Root className="tabs" value={tab} onValueChange={setTab}>
            <Tabs.List className="tab-list">
              <Tabs.Trigger value="chat">대화</Tabs.Trigger>
              <Tabs.Trigger value="log">로그</Tabs.Trigger>
              <Tabs.Trigger value="memory">메모리</Tabs.Trigger>
              <Tabs.Trigger value="workflow">워크플로우</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="chat" className="tab-body">
              {session ? (
                <Chat
                  session={session}
                  onClear={clearSession}
                  onLog={(id) => {
                    setLogTask(id);
                    setTab('log');
                  }}
                />
              ) : (
                <p className="empty">폴더를 열어 프로젝트를 시작하세요.</p>
              )}
            </Tabs.Content>
            <Tabs.Content value="log" className="tab-body">
              {session && <Log session={session} members={members} taskId={logTask} onTask={setLogTask} />}
            </Tabs.Content>
            <Tabs.Content value="memory" className="tab-body">
              {project && (
                <Memory projectId={project.id} members={members} memberId={memoryOf} onMember={setMemoryOf} />
              )}
            </Tabs.Content>
            {/* Kept mounted so unsaved edits survive a look at another tab */}
            <Tabs.Content value="workflow" className="tab-body" forceMount>
              {project && (
                <WorkflowView
                  project={project}
                  members={members}
                  kind={kind}
                  onKind={setKind}
                  active={tab === 'workflow'}
                />
              )}
            </Tabs.Content>
          </Tabs.Root>
        </aside>
      </main>
    </div>
  );
}
