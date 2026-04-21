/**
 * useTasks.ts
 *
 * React hook for managing tasks via the backend API.
 * Provides CRUD operations with proper error handling and loading states.
 */

import { useState, useEffect, useCallback } from 'react';
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

export interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createTask: (data: CreateTaskData) => Promise<Task>;
  updateTask: (id: string, data: UpdateTaskData) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
}

/**
 * Hook to fetch and manage tasks for the current user
 */
export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = useApiClient();

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<Task[]>('/tasks');
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchTasks();

    // Set up polling for real-time updates every 30 seconds
    const interval = setInterval(fetchTasks, 30000);

    return () => clearInterval(interval);
  }, [fetchTasks]);

  const createTask = useCallback(async (data: CreateTaskData): Promise<Task> => {
    const newTask = await api.post<Task>('/tasks', data);
    setTasks(prev => [...prev, newTask]);
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
  }, [api]);

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
  };
}