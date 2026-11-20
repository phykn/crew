import { useEffect, useState } from 'react';
import type { Project, Session } from '../backend/db';
import type { CrewMember } from '../backend/crew/shipped';
import type { Mode } from '../shared';
import { call, onChanged } from './api';

// The project, session, and crew the window shows, and every way to switch or change them
export function useWorkspace() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [members, setMembers] = useState<CrewMember[]>([]);

  // Whoever changes the record, the window or 비서, the main process says so and the window reads it again
  useEffect(
    () =>
      onChanged(async (t) => {
        if (t !== 'projects') return;
        const list = await call('projects.list');
        setProjects(list);
        setProject((p) => list.find((x) => x.id === p?.id) ?? p);
      }),
    [],
  );
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
    if (p) await selectProject(p);
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
    selectSession(await call('sessions.clear', { sessionId: session!.id }));
  }

  async function newSession() {
    selectSession(await call('sessions.create', { projectId: project!.id }));
  }

  function setMode(mode: Mode) {
    call('projects.setMode', { projectId: project!.id, mode });
  }

  return {
    projects,
    project,
    sessions,
    session,
    members,
    selectProject,
    selectSession,
    openFolder,
    afterDelete,
    clearSession,
    newSession,
    setMode,
  };
}
