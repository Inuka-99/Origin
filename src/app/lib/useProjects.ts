/**
 * useProjects.ts
 *
 * React hook for managing projects via the backend API.
 * Provides CRUD operations with proper error handling and loading
 * states.
 *
 * Scalability notes:
 *   - The backend `/projects` endpoint now returns a paginated
 *     envelope. We unwrap `data` so existing pages don't need to
 *     change shape, and surface `total` for callers that want it.
 *   - Polling cadence was reduced from 30s to 60s. Projects change
 *     much less often than tasks, and frequent polling for a list
 *     that rarely moves is just wasted bandwidth and DB load.
 *   - In-flight requests are aborted on unmount / refetch to avoid
 *     stale-state races.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useApiClient } from '../lib/api-client';

const PROJECT_POLL_MS = 60_000;

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  user_role?: 'admin' | 'member' | null;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

export interface CreateProjectData {
  name: string;
  description?: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface UseProjectsReturn {
  projects: Project[];
  total: number;
  loading: boolean;
  error: string | null;
  createProject: (data: CreateProjectData) => Promise<Project>;
  updateProject: (id: string, data: UpdateProjectData) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  refetch: () => void;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = useApiClient();
  const abortRef = useRef<AbortController | null>(null);

  const fetchProjects = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const response = await api.get<PaginatedResponse<Project> | Project[]>(
        '/projects',
        { signal: controller.signal },
      );

      if (controller.signal.aborted) return;

      // Tolerate both the new paginated envelope and the legacy
      // array shape during rollout.
      if (Array.isArray(response)) {
        setProjects(response);
        setTotal(response.length);
      } else {
        setProjects(response.data);
        setTotal(response.total);
      }
    } catch (err) {
      if (
        (err as Error)?.name === 'AbortError' ||
        controller.signal.aborted
      ) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [api]);

  const createProject = useCallback(async (data: CreateProjectData): Promise<Project> => {
    const newProject = await api.post<Project>('/projects', data);
    setProjects(prev => [newProject, ...prev]);
    setTotal(prev => prev + 1);
    return newProject;
  }, [api]);

  const updateProject = useCallback(async (id: string, data: UpdateProjectData): Promise<Project> => {
    const updatedProject = await api.patch<Project>(`/projects/${id}`, data);
    setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
    return updatedProject;
  }, [api]);

  const deleteProject = useCallback(async (id: string): Promise<void> => {
    await api.delete(`/projects/${id}`);
    setProjects(prev => prev.filter(p => p.id !== id));
    setTotal(prev => Math.max(0, prev - 1));
  }, [api]);

  useEffect(() => {
    void fetchProjects();

    // Light background refresh — projects change rarely so we don't
    // need the aggressive 30s cadence the original hook used.
    const interval = setInterval(() => void fetchProjects(), PROJECT_POLL_MS);

    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [fetchProjects]);

  return {
    projects,
    total,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects,
  };
}

export interface UseProjectMembersReturn {
  members: ProjectMember[];
  loading: boolean;
  error: string | null;
  addMember: (userId: string, role?: 'admin' | 'member') => Promise<ProjectMember>;
  removeMember: (userId: string) => Promise<void>;
  refetch: () => void;
}

export function useProjectMembers(projectId: string): UseProjectMembersReturn {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = useApiClient();
  const abortRef = useRef<AbortController | null>(null);

  const fetchMembers = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);
      const data = await api.get<ProjectMember[]>(
        `/projects/${projectId}/members`,
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      setMembers(data);
    } catch (err) {
      if (
        (err as Error)?.name === 'AbortError' ||
        controller.signal.aborted
      ) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [api, projectId]);

  const addMember = useCallback(async (userId: string, role: 'admin' | 'member' = 'member'): Promise<ProjectMember> => {
    const newMember = await api.post<ProjectMember>(`/projects/${projectId}/members`, { user_id: userId, role });
    setMembers(prev => [...prev, newMember]);
    return newMember;
  }, [api, projectId]);

  const removeMember = useCallback(async (userId: string): Promise<void> => {
    await api.delete(`/projects/${projectId}/members/${userId}`);
    setMembers(prev => prev.filter(m => m.user_id !== userId));
  }, [api, projectId]);

  useEffect(() => {
    if (projectId) {
      void fetchMembers();
    }
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchMembers, projectId]);

  return {
    members,
    loading,
    error,
    addMember,
    removeMember,
    refetch: fetchMembers,
  };
}
