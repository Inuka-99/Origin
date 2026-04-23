import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase';

export interface Task {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskDto {
  project_id?: string | null;
  title: string;
  description?: string;
  status?: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  priority?: 'High' | 'Medium' | 'Low';
  due_date?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string | null;
  status?: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  priority?: 'High' | 'Medium' | 'Low';
  due_date?: string | null;
}

export type TaskSortOption = 'default' | 'title-asc' | 'due-asc' | 'priority-desc';
export type TaskStatusFilter = 'all' | 'To Do' | 'In Progress' | 'In Review' | 'Done';
export type TaskPriorityFilter = 'all' | 'High' | 'Medium' | 'Low';
export type TaskDueDateFilter = 'all' | 'today' | 'upcoming' | 'overdue' | 'no-date';

@Injectable()
export class TasksService {
  constructor(private readonly supabase: SupabaseService) {}

  private get client() {
    return this.supabase.getClient();
  }

  async create(dto: CreateTaskDto, userId: string): Promise<Task> {
    if (dto.project_id) {
      await this.assertProjectMember(dto.project_id, userId);
    }

    const convertStatus = (status: string): string => {
      const normalized = status.trim().toLowerCase();
      const statusMap: Record<string, string> = {
        'to do': 'To Do',
        'todo': 'To Do',
        'in progress': 'In Progress',
        'in_progress': 'In Progress',
        'in-progress': 'In Progress',
        'in review': 'In Review',
        'in_review': 'In Review',
        'review': 'In Review',
        'done': 'Done',
      };
      const result = statusMap[normalized];
      if (!result) {
        throw new BadRequestException(`Invalid task status: ${status}`);
      }
      return result;
    };

    const { data, error } = await this.client
      .from('tasks')
      .insert({
        project_id: dto.project_id ?? null,
        title: dto.title,
        description: dto.description ?? null,
        status: convertStatus(dto.status ?? 'To Do'),
        priority: (dto.priority ?? 'Medium').toLowerCase(),
        due_date: dto.due_date ?? null,
        created_by: userId,
      })
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data as Task;
  }

  async listForUser(
    userId: string,
    userRole: string,
    search?: string,
    status: TaskStatusFilter = 'all',
    priority: TaskPriorityFilter = 'all',
    dueDate: TaskDueDateFilter = 'all',
    sortBy: TaskSortOption = 'default',
  ): Promise<Task[]> {
    const normalizedSearch = search?.trim().toLowerCase();
    const normalizedStatus = this.normalizeStatusFilter(status);
    const normalizedPriority = this.normalizePriorityFilter(priority);
    const normalizedDueDate = this.normalizeDueDateFilter(dueDate);
    const normalizedSort = this.normalizeSortOption(sortBy);

    if (userRole === 'admin') {
      const { data, error } = await this.client
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new BadRequestException(error.message);
      const filteredTasks = this.filterTasks(
        (data ?? []) as Task[],
        normalizedSearch,
        normalizedStatus,
        normalizedPriority,
        normalizedDueDate,
      );
      return this.sortTasks(filteredTasks, normalizedSort);
    }

    const { data: memberships, error: mError } = await this.client
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId);

    if (mError) throw new BadRequestException(mError.message);

    const projectIds = (memberships ?? []).map((m: any) => m.project_id);

    let query = this.client.from('tasks').select('*').order('created_at', { ascending: false });

    if (projectIds.length > 0) {
      query = query.in('project_id', projectIds);
    } else {
      query = query.is('project_id', null);
    }

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    const filteredTasks = this.filterTasks(
      (data ?? []) as Task[],
      normalizedSearch,
      normalizedStatus,
      normalizedPriority,
      normalizedDueDate,
    );
    return this.sortTasks(filteredTasks, normalizedSort);
  }

  async getById(id: string, userId: string, userRole: string): Promise<Task> {
    const { data, error } = await this.client
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Task not found');
    }

    const task = data as Task;

    if (userRole === 'admin') return task;

    if (!task.project_id) {
      throw new ForbiddenException('Not authorized to access this task');
    }

    const { data: membership } = await this.client
      .from('project_members')
      .select('role')
      .eq('project_id', task.project_id)
      .eq('user_id', userId)
      .single();

    if (membership) return task;

    throw new ForbiddenException('Not authorized to access this task');
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    userId: string,
    userRole: string,
  ): Promise<Task> {
    const { data: existing, error: fetchError } = await this.client
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundException('Task not found');
    }

    const task = existing as Task;

    if (userRole !== 'admin') {
      if (task.project_id) {
        await this.assertProjectAdmin(task.project_id, userId);
      } else {
        throw new ForbiddenException('Not authorized to modify a standalone task');
      }
    }

    const updatePayload: any = { ...dto };
    if (updatePayload.status) {
      const normalized = updatePayload.status.trim().toLowerCase();
      const statusMap: Record<string, string> = {
        'to do': 'To Do',
        'todo': 'To Do',
        'in progress': 'In Progress',
        'in_progress': 'In Progress',
        'in-progress': 'In Progress',
        'in review': 'In Review',
        'in_review': 'In Review',
        'review': 'In Review',
        'done': 'Done',
      };
      if (!statusMap[normalized]) {
        throw new BadRequestException(`Invalid task status: ${updatePayload.status}`);
      }
      updatePayload.status = statusMap[normalized];
    }
    if (updatePayload.priority) {
      updatePayload.priority = updatePayload.priority.toLowerCase();
    }

    const { data, error } = await this.client
      .from('tasks')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Update failed');
    }

    return data as Task;
  }

  async delete(id: string, userId: string, userRole: string): Promise<void> {
    const { data: existing, error: fetchError } = await this.client
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      throw new NotFoundException('Task not found');
    }

    const task = existing as Task;

    if (userRole !== 'admin') {
      if (task.project_id) {
        await this.assertProjectAdmin(task.project_id, userId);
      } else {
        throw new ForbiddenException('Not authorized to delete this standalone task');
      }
    }

    const { error } = await this.client
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  private async assertProjectMember(projectId: string, userId: string): Promise<void> {
    const { data } = await this.client
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (!data) {
      throw new ForbiddenException('User is not a member of the project');
    }
  }

  private async assertProjectAdmin(projectId: string, userId: string): Promise<void> {
    const { data } = await this.client
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (!data || data.role !== 'admin') {
      throw new ForbiddenException('Only project admins can perform this action');
    }
  }

  private filterTasks(
    tasks: Task[],
    search?: string,
    status: TaskStatusFilter = 'all',
    priority: TaskPriorityFilter = 'all',
    dueDate: TaskDueDateFilter = 'all',
  ): Task[] {
    return tasks.filter((task) => {
      const title = task.title.toLowerCase();
      const description = task.description?.toLowerCase() ?? '';
      const matchesSearch = !search || title.includes(search) || description.includes(search);
      const matchesStatus = status === 'all' || task.status === status;
      const matchesPriority =
        priority === 'all' || this.normalizePriorityValue(task.priority) === priority.toLowerCase();
      const matchesDueDate = this.matchesDueDateFilter(task.due_date, dueDate);

      return matchesSearch && matchesStatus && matchesPriority && matchesDueDate;
    });
  }

  private normalizeStatusFilter(status?: string): TaskStatusFilter {
    if (!status) {
      return 'all';
    }

    const supportedStatusFilters: TaskStatusFilter[] = [
      'all',
      'To Do',
      'In Progress',
      'In Review',
      'Done',
    ];

    if (!supportedStatusFilters.includes(status as TaskStatusFilter)) {
      throw new BadRequestException(`Invalid task status filter: ${status}`);
    }

    return status as TaskStatusFilter;
  }

  private normalizePriorityFilter(priority?: string): TaskPriorityFilter {
    if (!priority) {
      return 'all';
    }

    const supportedPriorityFilters: TaskPriorityFilter[] = [
      'all',
      'High',
      'Medium',
      'Low',
    ];

    if (!supportedPriorityFilters.includes(priority as TaskPriorityFilter)) {
      throw new BadRequestException(`Invalid task priority filter: ${priority}`);
    }

    return priority as TaskPriorityFilter;
  }

  private normalizeDueDateFilter(dueDate?: string): TaskDueDateFilter {
    if (!dueDate) {
      return 'all';
    }

    const supportedDueDateFilters: TaskDueDateFilter[] = [
      'all',
      'today',
      'upcoming',
      'overdue',
      'no-date',
    ];

    if (!supportedDueDateFilters.includes(dueDate as TaskDueDateFilter)) {
      throw new BadRequestException(`Invalid task due date filter: ${dueDate}`);
    }

    return dueDate as TaskDueDateFilter;
  }

  private normalizeSortOption(sortBy?: string): TaskSortOption {
    if (!sortBy) {
      return 'default';
    }

    const supportedSortOptions: TaskSortOption[] = [
      'default',
      'title-asc',
      'due-asc',
      'priority-desc',
    ];

    if (!supportedSortOptions.includes(sortBy as TaskSortOption)) {
      throw new BadRequestException(`Invalid task sort option: ${sortBy}`);
    }

    return sortBy as TaskSortOption;
  }

  private normalizePriorityValue(priority?: string): string {
    return priority?.trim().toLowerCase() ?? '';
  }

  private matchesDueDateFilter(dueDate: string | null, filter: TaskDueDateFilter): boolean {
    if (filter === 'all') {
      return true;
    }

    if (filter === 'no-date') {
      return !dueDate;
    }

    if (!dueDate) {
      return false;
    }

    const dueDateKey = dueDate.slice(0, 10);
    const today = new Date();
    const todayKey = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      .toISOString()
      .slice(0, 10);

    if (filter === 'today') {
      return dueDateKey === todayKey;
    }

    if (filter === 'upcoming') {
      return dueDateKey > todayKey;
    }

    if (filter === 'overdue') {
      return dueDateKey < todayKey;
    }

    return true;
  }

  private sortTasks(tasks: Task[], sortBy: TaskSortOption): Task[] {
    if (sortBy === 'default') {
      return tasks;
    }

    const priorityRank: Record<string, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    return [...tasks].sort((left, right) => {
      switch (sortBy) {
        case 'title-asc':
          return left.title.localeCompare(right.title);
        case 'due-asc': {
          if (!left.due_date && !right.due_date) return 0;
          if (!left.due_date) return 1;
          if (!right.due_date) return -1;
          return new Date(left.due_date).getTime() - new Date(right.due_date).getTime();
        }
        case 'priority-desc':
          return (priorityRank[left.priority] ?? Number.MAX_SAFE_INTEGER)
            - (priorityRank[right.priority] ?? Number.MAX_SAFE_INTEGER);
        default:
          return 0;
      }
    });
  }
}
