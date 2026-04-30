/**
 * useTasks.ts
 *
 * React hook for managing tasks via the backend API.
 * Provides CRUD operations with proper error handling and loading
 * states.
 *
 * Scalability notes:
 *   - The backend `/tasks` endpoint now returns a paginated envelope
 *     `{ data, total, page, limit }`. We unwrap `data` here so
 *     existing consumers don't need to change shape, while exposing
 *     `total` for pages that want to show counts.
 *   - We removed the 30s polling. Real-time updates are delivered
 *     by the Supabase broadcast channel (see use-task-realtime.ts);
 *     polling on top of that is wasteful. Pages that don't subscribe
 *     to realtime can still call `refetch()` manually.
 *   - In-flight requests are aborted when the component unmounts or
 *     a fresh fetch is triggered, eliminating the late-response race
 *     where stale data overwrites newer data.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useApiClient } from '../lib/api-client';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  project_id?: string;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  project?: {
    id: string;
    name: string;
    color?: string;
  };
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  project_id?: string;
  assigned_to?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  project_id?: string;
  assigned_to?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface UseTasksOptions {
  /** Optional fixed page size. Defaults to the server default. */
  limit?: number;
  /** Optional 1-based page number. Defaults to 1. */
  page?: number;
}

export interface UseTasksReturn {
  tasks: Task[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createTask: (data: CreateTaskData) => Promise<Task>;
  updateTask: (id: string, data: UpdateTaskData) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
}

/**
 * Hook to fetch and manage tasks for the current user.
 */
export function useTasks(options: UseTasksOptions = {}): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = useApiClient();
  const abortRef = useRef<AbortController | null>(null);

  const { page, limit } = options;

  const fetchTasks = useCallback(async () => {
    // Cancel any in-flight request from a previous fetch so a slow
    // response can't overwrite fresher state.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (page !== undefined) params.set('page', String(page));
      if (limit !== undefined) params.set('limit', String(limit));
      const qs = params.toString();
      const path = qs ? `/tasks?${qs}` : '/tasks';

      const response = await api.get<PaginatedResponse<Task> | Task[]>(path, {
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      // Tolerate both the new paginated shape and the legacy array
      // shape so deploys can roll forward without lockstep.
      if (Array.isArray(response)) {
        setTasks(response);
        setTotal(response.length);
      } else {
        setTasks(response.data);
        setTotal(response.total);
      }
    } catch (err) {
      if (
        (err as Error)?.name === 'AbortError' ||
        controller.signal.aborted
      ) {
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [api, page, limit]);

  useEffect(() => {
    void fetchTasks();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchTasks]);

  const createTask = useCallback(async (data: CreateTaskData): Promise<Task> => {
    const newTask = await api.post<Task>('/tasks', data);
    setTasks(prev => [...prev, newTask]);
    setTotal(prev => prev + 1);
    return newTask;
  }, [api]);

  const updateTask = useCallback(async (id: string, data: UpdateTaskData): Promise<Task> => {
    const updatedTask = await api.patch<Task>(`/tasks/${id}`, data);
    setTasks(prev => prev.map(task => task.id === id ? updatedTask : task));
    return updatedTask;
  }, [api]);

  const deleteTask = useCallback(async (id: string): Promise<void> => {
    await api.delete(`/tasks/${id}`);
    setTasks(prev => prev.filter(task => task.id !== id));
    setTotal(prev => Math.max(0, prev - 1));
  }, [api]);

  return {
    tasks,
    total,
    loading,
    error,
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
  };
}
