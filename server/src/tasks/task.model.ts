// Possible statuses for a task
export type TaskStatus = 'todo' | 'in_progress' | 'done';

// Task interface represents a single task object
export interface Task {
  id: string; // Unique identifier for the task
  title: string; // Title of the task
  description?: string; // Optional description
  status: TaskStatus; // Current status of the task
  assignedTo?: string; // User ID of the person assigned to the task
}
