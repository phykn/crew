import { useEffect, useState } from 'react';
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
import { Connections } from './components/Connections';
import { Tab, TabList, TabPanel, Tabs } from './ui/Tabs';
import { Confirm } from './ui/Confirm';
import { Empty } from './ui/Empty';
import { t, useLang } from './lang';

const TABS = [
  ['chat', 'tab.chat'],
  ['log', 'tab.log'],
  ['memory', 'tab.memory'],
  ['workflow', 'tab.workflow'],
  ['connect', 'tab.connect'],
] as const;

export function App() {
  useLang();
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

  // 통역 moves the window the way the user would by clicking
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
        <section className="camp" aria-label={t('app.camp')}>
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
          <Tabs className="tabs" value={tab} onValueChange={setTab}>
            <TabList>
              {TABS.map(([value, name]) => {
                const marked = value === 'chat' && waiting && !!session;
                return (
                  <Tab
                    key={value}
                    value={value}
                    icon={<TabIcon tab={value} />}
                    name={t(name)}
                    waiting={marked}
                    aria-label={marked ? t('tab.waiting', { name: t(name) }) : t(name)}
                  />
                );
              })}
            </TabList>
            {/* Kept mounted so a reply streaming in keeps its first words while another tab is open */}
            <TabPanel value="chat" className="tab-body" forceMount>
              {session ? (
                <Chat
                  session={session}
                  mode={project!.mode}
                  onMode={ws.setMode}
                  onWaiting={setWaiting}
                  commands={[
                    { name: 'clear', label: t('chat.newSession'), run: ws.newSession },
                    { name: 'log', run: () => setTab('log') },
                    { name: 'memory', run: () => setTab('memory') },
                    { name: 'workflow', run: () => setTab('workflow') },
                    { name: 'connect', run: () => setTab('connect') },
                  ]}
                  onLog={openLog}
                  onChanges={setChanges}
                />
              ) : (
                <Empty>{t('app.noProject')}</Empty>
              )}
            </TabPanel>
            <TabPanel value="log" className="tab-body">
              {session && (
                <Log session={session} members={members} taskId={logTask} onTask={setLogTask} onChanges={setChanges} />
              )}
            </TabPanel>
            <TabPanel value="memory" className="tab-body">
              {project && (
                <Memory projectId={project.id} members={members} memberId={memoryOf} onMember={setMemoryOf} />
              )}
            </TabPanel>
            {/* Kept mounted so unsaved edits survive a look at another tab */}
            <TabPanel value="workflow" className="tab-body" forceMount>
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
            </TabPanel>
            <TabPanel value="connect" className="tab-body">
              <Connections />
            </TabPanel>
          </Tabs>
        </aside>
      </main>
      {leaving && (
        <Confirm
          label={t('app.unsaved')}
          text={t('app.unsavedSwitch')}
          actions={[
            {
              label: t('action.switch'),
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
