/**
 * useProjects.ts
 *
 * React hook for managing projects via the backend API.
 * Provides CRUD operations with proper error handling and loading states.
 */

import { useState, useEffect, useCallback } from 'react';
import { useApiClient } from '../lib/api-client';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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

export interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  createProject: (data: CreateProjectData) => Promise<Project>;
  updateProject: (id: string, data: UpdateProjectData) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  refetch: () => void;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = useApiClient();

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<Project[]>('/projects');
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, [api]);

  const createProject = useCallback(async (data: CreateProjectData): Promise<Project> => {
    const newProject = await api.post<Project>('/projects', data);
    setProjects(prev => [newProject, ...prev]);
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
  }, [api]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
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

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<ProjectMember[]>(`/projects/${projectId}/members`);
      setMembers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
    } finally {
      setLoading(false);
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
      fetchMembers();
    }
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