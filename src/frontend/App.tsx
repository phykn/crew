import { useEffect, useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { onNavigate } from './api';
import { useWorkspace } from './workspace';
import { TitleBar } from './components/TitleBar';
import { ProjectBar } from './components/ProjectBar';
import { Chat } from './components/Chat';
import { Legend } from './components/Legend';
import { Log } from './components/Log';
import { ProjectTree } from './components/ProjectTree';
import { Memory } from './components/Memory';
import { WorkflowView } from './components/WorkflowView';
import { Camp } from './components/Camp';
import { TabIcon } from './components/Icons';
import { Changes, type ChangesTarget } from './components/Changes';
import { Confirm } from './components/Confirm';

const TABS = [
  ['chat', '대화'],
  ['log', '로그'],
  ['memory', '메모리'],
  ['workflow', '워크플로우'],
] as const;

export function App() {
  const ws = useWorkspace();
  const { project, session, members } = ws;
  const [tab, setTab] = useState('chat');
  const [tree, setTree] = useState(false);
  // The member whose memory the memory tab shows; null shows everyone's
  const [memoryOf, setMemoryOf] = useState<number | null>(null);
  // The workflow kind the workflow tab shows
  const [kind, setKind] = useState('code');
  // The task the log shows; null shows every task in the session
  const [logTask, setLogTask] = useState<number | null>(null);
  // A card waits for the user's answer, which the chat tab shows while another tab is open
  const [waiting, setWaiting] = useState(false);
  // The file whose diff the popup shows; the crew keeps working while it is open
  const [changes, setChanges] = useState<ChangesTarget | null>(null);
  // Unsaved workflow edits belong to this project, so leaving it asks first
  const [workflowDirty, setWorkflowDirty] = useState(false);
  const [leaving, setLeaving] = useState<(() => void) | null>(null);
  const guard = (go: () => void) => (workflowDirty ? setLeaving(() => go) : go());

  // A task filter belongs to its session, a member filter to its project
  useEffect(() => setLogTask(null), [session?.id]);
  useEffect(() => setMemoryOf(null), [project?.id]);

  function openLog(taskId: number | null) {
    setLogTask(taskId);
    setTab('log');
  }

  // 비서 moves the window the way the user would by clicking
  useEffect(
    () =>
      onNavigate((ev) => {
        if (ev.sessionId !== session?.id) return;
        if (ev.view === 'log') openLog(ev.taskId ?? null);
        else if (ev.view === 'wiki') setTab('memory');
        else {
          setKind(ev.kind ?? 'code');
          setTab('workflow');
        }
      }),
    [session?.id],
  );

  return (
    <div className="app">
      <TitleBar />
      <ProjectTree open={tree} onClose={() => setTree(false)} onDeleted={ws.afterDelete} />
      <main className="body">
        <section className="camp" aria-label="캠프">
          <Camp members={members} session={session} onPick={openLog} />
          {project && (
            <Legend
              members={members}
              onMemory={(id) => {
                setMemoryOf(id);
                setTab('memory');
              }}
            />
          )}
        </section>
        <aside className="panel">
          <ProjectBar
            projects={ws.projects}
            project={project}
            sessions={ws.sessions}
            session={session}
            onProject={(p) => guard(() => ws.selectProject(p))}
            onOpenFolder={() => guard(ws.openFolder)}
            onOpenList={ws.refreshProjects}
            onSession={(s) => ws.selectSession(s)}
            onNewSession={ws.newSession}
            onExplorer={() => setTree(true)}
          />
          <Tabs.Root className="tabs" value={tab} onValueChange={setTab}>
            {/* Icons keep the tabs small; each name shows on hover and is what a screen reader says */}
            <Tabs.List className="tab-list">
              {TABS.map(([value, name]) => {
                const marked = value === 'chat' && waiting && !!session;
                return (
                  <Tabs.Trigger
                    key={value}
                    value={value}
                    title={name}
                    aria-label={marked ? `${name}, 대답 대기` : name}
                    data-waiting={marked || undefined}
                  >
                    <TabIcon tab={value} />
                  </Tabs.Trigger>
                );
              })}
            </Tabs.List>
            {/* Kept mounted so a reply streaming in keeps its first words while another tab is open */}
            <Tabs.Content value="chat" className="tab-body" forceMount>
              {session ? (
                <Chat
                  session={session}
                  mode={project!.mode}
                  onMode={ws.setMode}
                  onWaiting={setWaiting}
                  commands={[
                    { name: 'clear', label: '새 세션', run: ws.newSession },
                    { name: 'log', run: () => setTab('log') },
                    { name: 'memory', run: () => setTab('memory') },
                    { name: 'workflow', run: () => setTab('workflow') },
                  ]}
                  onLog={openLog}
                />
              ) : (
                <p className="empty">폴더를 열어 프로젝트를 시작하세요.</p>
              )}
            </Tabs.Content>
            <Tabs.Content value="log" className="tab-body">
              {session && (
                <Log session={session} members={members} taskId={logTask} onTask={setLogTask} onChanges={setChanges} />
              )}
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
                  onDirty={setWorkflowDirty}
                />
              )}
            </Tabs.Content>
          </Tabs.Root>
        </aside>
      </main>
      {leaving && (
        <Confirm
          label="저장 안 한 변경"
          text="저장 안 한 워크플로우 변경이 사라집니다. 다른 프로젝트로 바꿀까요?"
          actions={[
            {
              label: '바꾸기',
              danger: true,
              run: () => {
                leaving();
                setLeaving(null);
              },
            },
          ]}
          onCancel={() => setLeaving(null)}
        />
      )}
      <Changes
        target={changes}
        waiting={waiting}
        onClose={() => setChanges(null)}
        onChat={() => {
          setChanges(null);
          setTab('chat');
        }}
      />
    </div>
  );
}
