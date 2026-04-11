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

export function getProjectPriorityFieldClasses(priority: ProjectPriority): string {
  switch (priority) {
    case 'Low':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100 focus-visible:border-emerald-400 focus-visible:ring-emerald-200';
    case 'Medium':
      return 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100 focus-visible:border-amber-400 focus-visible:ring-amber-200';
    case 'High':
      return 'border-rose-200 bg-rose-50 text-rose-800 hover:border-rose-300 hover:bg-rose-100 focus-visible:border-rose-400 focus-visible:ring-rose-200';
    case 'Urgent':
      return 'border-red-400 bg-red-100 text-red-900 ring-1 ring-red-200 hover:border-red-500 hover:bg-red-200 focus-visible:border-red-600 focus-visible:ring-red-200';
    default:
      return '';
  }
}

export function getProjectPriorityOptionClasses(priority: ProjectPriority): string {
  switch (priority) {
    case 'Low':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100';
    case 'Medium':
      return 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100';
    case 'High':
      return 'border-rose-200 bg-rose-50 text-rose-800 hover:border-rose-300 hover:bg-rose-100';
    case 'Urgent':
      return 'border-red-400 bg-red-100 text-red-900 hover:border-red-500 hover:bg-red-200';
    default:
      return '';
  }
}

export function getProjectPriorityBadgeClasses(priority: ProjectPriority): string {
  switch (priority) {
    case 'Low':
      return 'border border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'Medium':
      return 'border border-amber-200 bg-amber-50 text-amber-800';
    case 'High':
      return 'border border-rose-200 bg-rose-50 text-rose-800';
    case 'Urgent':
      return 'border border-red-400 bg-red-100 text-red-900 shadow-sm';
    default:
      return 'border border-gray-200 bg-gray-50 text-gray-700';
  }
}
