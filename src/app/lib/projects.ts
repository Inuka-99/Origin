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

export type ProjectMemberRole =
  | 'Admin'
  | 'Project Manager'
  | 'Team Lead'
  | 'Developer'
  | 'Designer'
  | 'Tester';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  joined_at: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_creator: boolean;
}

export interface ProjectMemberCandidate {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface AddProjectMemberPayload {
  user_id?: string;
  email?: string;
  role: ProjectMemberRole;
}
