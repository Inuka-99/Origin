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
 * Normalize task status values from API to consistent lowercase format
 */
function normalizeTaskStatus(status: any): 'todo' | 'in_progress' | 'done' {
  if (!status) return 'todo';
  
  const statusStr = String(status).toLowerCase();
  
  // Map various status formats to normalized values
  if (statusStr.includes('todo') || statusStr === 'to do') return 'todo';
  if (statusStr.includes('progress') || statusStr === 'in progress') return 'in_progress';
  if (statusStr.includes('review') || statusStr.includes('done') || statusStr === 'completed') return 'done';
  
  return 'todo';
}

/**
 * Normalize task priority values from API to consistent lowercase format
 */
function normalizeTaskPriority(priority: any): 'low' | 'medium' | 'high' {
  if (!priority) return 'medium';
  
  const priorityStr = String(priority).toLowerCase();
  
  if (priorityStr.includes('high')) return 'high';
  if (priorityStr.includes('low')) return 'low';
  
  return 'medium';
}

/**
 * Normalize task data from API
 */
function normalizeTasks(tasks: Task[]): Task[] {
  return tasks.map(task => ({
    ...task,
    status: normalizeTaskStatus(task.status),
    priority: normalizeTaskPriority(task.priority),
  }));
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
      setTasks(normalizeTasks(data));
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
    const normalized = { 
      ...newTask, 
      status: normalizeTaskStatus(newTask.status),
      priority: normalizeTaskPriority(newTask.priority),
    };
    setTasks(prev => [...prev, normalized]);
    return normalized;
  }, [api]);

  const updateTask = useCallback(async (id: string, data: UpdateTaskData): Promise<Task> => {
    const updatedTask = await api.patch<Task>(`/tasks/${id}`, data);
    const normalized = { 
      ...updatedTask, 
      status: normalizeTaskStatus(updatedTask.status),
      priority: normalizeTaskPriority(updatedTask.priority),
    };
    setTasks(prev => prev.map(task => task.id === id ? normalized : task));
    return normalized;
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