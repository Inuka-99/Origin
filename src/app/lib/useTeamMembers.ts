import { useCallback, useEffect, useState } from 'react';
import { useApiClient, unwrapList, type PaginatedList } from './api-client';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Member';
  avatar: string;
  department: string;
  status: 'Active' | 'Invited';
  tasksCount: number;
}

interface Project {
  id: string;
  name: string;
}

interface ProjectMember {
  user_id: string;
  role: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_creator?: boolean;
}

interface Task {
  assigned_to?: string | null;
  assignee_id?: string | null;
}

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'admin' | 'member';
}

function initialsFor(name: string, email: string): string {
  const source = name.trim() || email.trim();
  const parts = source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2);
  return (parts.map((part) => part[0]).join('') || 'U').toUpperCase();
}

export function useTeamMembers() {
  const api = useApiClient();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [projectsResponse, tasksResponse] = await Promise.all([
        api.get<Project[] | PaginatedList<Project>>('/projects?limit=100'),
        api.get<Task[] | PaginatedList<Task>>('/tasks?limit=500'),
      ]);

      const projects = unwrapList(projectsResponse);
      const tasks = unwrapList(tasksResponse);
      const taskCounts = tasks.reduce<Record<string, number>>((counts, task) => {
        const userId = task.assignee_id ?? task.assigned_to;
        if (userId) counts[userId] = (counts[userId] ?? 0) + 1;
        return counts;
      }, {});

      const memberRows = (
        await Promise.all(
          projects.map(async (project) => {
            try {
              const projectMembers = await api.get<ProjectMember[]>(`/projects/${project.id}/members`);
              return projectMembers.map((member) => ({ ...member, projectName: project.name }));
            } catch {
              return [];
            }
          }),
        )
      ).flat();

      const memberMap = new Map<string, TeamMember & { projectNames: Set<string> }>();

      memberRows.forEach((member) => {
        const name = member.full_name?.trim() || member.email?.trim() || 'Unnamed user';
        const email = member.email?.trim() || 'No email';
        const existing = memberMap.get(member.user_id);
        const isAdmin = member.is_creator || member.role.toLowerCase() === 'admin';

        if (existing) {
          existing.projectNames.add(member.projectName);
          if (isAdmin) existing.role = 'Admin';
          existing.tasksCount = taskCounts[member.user_id] ?? 0;
          existing.department = Array.from(existing.projectNames).slice(0, 2).join(', ');
          return;
        }

        const projectNames = new Set<string>([member.projectName]);
        memberMap.set(member.user_id, {
          id: member.user_id,
          name,
          email,
          role: isAdmin ? 'Admin' : 'Member',
          avatar: initialsFor(name, email),
          department: Array.from(projectNames).join(', '),
          status: 'Active',
          tasksCount: taskCounts[member.user_id] ?? 0,
          projectNames,
        });
      });

      if (memberMap.size === 0) {
        const profile = await api.get<UserProfile>('/users/me');
        const name = profile.full_name?.trim() || profile.email?.trim() || 'You';
        const email = profile.email?.trim() || 'No email';
        memberMap.set(profile.id, {
          id: profile.id,
          name,
          email,
          role: profile.role === 'admin' ? 'Admin' : 'Member',
          avatar: initialsFor(name, email),
          department: 'No projects',
          status: 'Active',
          tasksCount: taskCounts[profile.id] ?? 0,
          projectNames: new Set(),
        });
      }

      setMembers(
        Array.from(memberMap.values())
          .map(({ projectNames: _projectNames, ...member }) => member)
          .sort((left, right) => left.name.localeCompare(right.name)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { members, loading, error, refetch };
}
