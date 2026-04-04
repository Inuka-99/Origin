export interface Project {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  due_date: string | null;
  priority: ProjectPriority;
  status: ProjectStatus;
  department: string;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ProjectPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type ProjectStatus =
  | 'Planning'
  | 'Active'
  | 'In Progress'
  | 'Review'
  | 'On Hold'
  | 'Completed'
  | 'Archived';

export interface CreateProjectPayload {
  name: string;
  description?: string;
  start_date?: string;
  due_date?: string;
  priority: ProjectPriority;
  status?: ProjectStatus;
  department: string;
  tags?: string[];
}
