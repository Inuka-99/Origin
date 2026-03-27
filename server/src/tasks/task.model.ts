// Possible statuses for a task
export type TaskStatus = 'todo' | 'in_progress' | 'done';

// Task interface represents a single task object
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedTo?: string; // user id
}
