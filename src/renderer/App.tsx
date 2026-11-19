import { useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import type { Project, Session } from '../main/db';
import type { CrewMember } from '../main/crew';
import { call } from './api';
import { TitleBar } from './components/TitleBar';
import { ProjectBar } from './components/ProjectBar';
import { Chat } from './components/Chat';
import { Legend } from './components/Legend';
import { Log } from './components/Log';
import { ProjectTree } from './components/ProjectTree';

export function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [tab, setTab] = useState('chat');
  const [tree, setTree] = useState(false);
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
    // A project always has a session to talk in, so the first open starts 세션 01
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
      <main className="body">
        <section className="camp" aria-label="캠프">
          {project && <Legend members={members} onChange={async () => setMembers(await call('members.list', { projectId: project.id }))} />}
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
            onTree={() => setTree(true)}
          />
          <ProjectTree open={tree} onClose={() => setTree(false)} onDeleted={afterDelete} />
          <Tabs.Root className="tabs" value={tab} onValueChange={setTab}>
            <Tabs.List className="tab-list">
              <Tabs.Trigger value="chat">대화</Tabs.Trigger>
              <Tabs.Trigger value="log">로그</Tabs.Trigger>
              <Tabs.Trigger value="memory">메모리</Tabs.Trigger>
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
            <Tabs.Content value="memory" className="tab-body" />
          </Tabs.Root>
        </aside>
      </main>
    </div>
  );
}
