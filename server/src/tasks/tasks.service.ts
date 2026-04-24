import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
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
  assigned_to: string | null; // User ID of the assigned team member
  assignee_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaskDto {
  project_id?: string | null;
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'In Review' | 'Done' | 'completed';
  priority?: 'High' | 'Medium' | 'Low';
  due_date?: string;
  assigned_to?: string | null; // User ID to assign the task to on creation
  assignee_id?: string | null;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string | null;
  status?: 'todo' | 'in_progress' | 'In Review' | 'Done' | 'completed';
  priority?: 'High' | 'Medium' | 'Low';
  due_date?: string | null;
  assigned_to?: string | null; // User ID to assign (or null to unassign)
  assignee_id?: string | null;
}

export interface BulkUpdateTasksDto {
  taskIds?: string[];
  status?: UpdateTaskDto['status'];
  priority?: UpdateTaskDto['priority'];
}

export interface BulkUpdateTasksResult {
  updated: Task[];
  updatedCount: number;
  requestedCount: number;
}

export type TaskSortOption = 'default' | 'title-asc' | 'due-asc' | 'priority-desc';
export type TaskStatusFilter = 'all' | 'To Do' | 'In Progress' | 'In Review' | 'Done';
export type TaskPriorityFilter = 'all' | 'High' | 'Medium' | 'Low';
export type TaskDueDateFilter = 'all' | 'today' | 'upcoming' | 'overdue' | 'no-date';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private get client() {
    return this.supabase.getClient();
  }

  private async broadcastTaskEvent(event: string, payload: unknown): Promise<void> {
    try {
      const channel = this.client.channel('tasks');
      await channel.send({ type: 'broadcast', event, payload });
    } catch (error) {
      this.logger.warn(`Realtime broadcast failed for ${event}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async create(dto: CreateTaskDto, userId: string): Promise<Task> {
    const assigneeId = dto.assignee_id ?? dto.assigned_to ?? null;

    if (dto.project_id) {
      await this.assertProjectMember(dto.project_id, userId);
      if (assigneeId) {
        await this.assertProjectMember(dto.project_id, assigneeId);
      }
    }

    const convertStatus = (status: string): string => {
      const normalized = status.trim().toLowerCase();
      const statusMap: Record<string, string> = {
        'to do': 'todo',
        'todo': 'todo',
        'to_do': 'todo',
        'in progress': 'in_progress',
        'in_progress': 'in_progress',
        'in-progress': 'in_progress',
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

    const insertPayload: Partial<Task> = {
      project_id: dto.project_id ?? null,
      title: dto.title,
      description: dto.description ?? null,
      status: convertStatus(dto.status ?? 'To Do'),
      priority: (dto.priority ?? 'Medium').toLowerCase(),
      due_date: dto.due_date ?? null,
      assigned_to: assigneeId,
      created_by: userId,
    };

    const { data, error } = await this.client
      .from('tasks')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Unable to create task');
    }

    const task = data as Task;

    if (assigneeId) {
      const { error: assignmentError } = await this.client
        .from('task_assignments')
        .insert({
          task_id: task.id,
          user_id: assigneeId,
        });

      if (assignmentError) {
        throw new BadRequestException(assignmentError.message);
      }
      task.assignee_id = assigneeId;
      task.assigned_to = assigneeId;
    }

    await this.broadcastTaskEvent('task:created', task);
    return task;
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
    let tasks: Task[] = [];
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
      tasks = (data ?? []) as Task[];
    } else {
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
      tasks = (data ?? []) as Task[];
    }

    const filteredTasks = this.filterTasks(
      tasks,
      normalizedSearch,
      normalizedStatus,
      normalizedPriority,
      normalizedDueDate,
    );

    return this.attachTaskAssignees(this.sortTasks(filteredTasks, normalizedSort));
  }

  async listByProject(projectId: string, userId: string, userRole: string): Promise<Task[]> {
    if (userRole !== 'admin') {
      await this.assertProjectMember(projectId, userId);
    }

    const { data, error } = await this.client
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return this.attachTaskAssignees((data ?? []) as Task[]);
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

    if (userRole === 'admin') {
      return this.attachTaskAssignees([task]).then((tasks) => tasks[0]);
    }

    if (!task.project_id) {
      throw new ForbiddenException('Not authorized to access this task');
    }

    const { data: membership } = await this.client
      .from('project_members')
      .select('role')
      .eq('project_id', task.project_id)
      .eq('user_id', userId)
      .single();

    if (membership) {
      return this.attachTaskAssignees([task]).then((tasks) => tasks[0]);
    }

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
      if (!task.project_id) {
        throw new BadRequestException('Task must have an associated project');
      }
      await this.assertProjectAdmin(task.project_id, userId);
    }

    const updatePayload: any = { ...dto };
    if (updatePayload.status) {
      const normalized = updatePayload.status.trim().toLowerCase();
      const statusMap: Record<string, string> = {
        'to do': 'todo',
        'todo': 'todo',
        'to_do': 'todo',
        'in progress': 'in_progress',
        'in_progress': 'in_progress',
        'in-progress': 'in_progress',
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

    if (dto.assignee_id !== undefined && task.project_id) {
      if (dto.assignee_id) {
        await this.assertProjectMember(task.project_id, dto.assignee_id);
      }
    }

    const assignmentUserId =
      dto.assignee_id !== undefined ? dto.assignee_id : dto.assigned_to;

    if (assignmentUserId !== undefined && task.project_id) {
      if (assignmentUserId) {
        await this.assertProjectMember(task.project_id, assignmentUserId);
      }
      updatePayload.assigned_to = assignmentUserId ?? null;
    }

    delete updatePayload.assignee_id;
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

    const updatedTask = data as Task;

    if (assignmentUserId !== undefined && task.project_id) {
      await this.syncTaskAssignment(updatedTask.id, assignmentUserId);
      updatedTask.assignee_id = assignmentUserId ?? null;
      updatedTask.assigned_to = assignmentUserId ?? null;
    }

    await this.broadcastTaskEvent('task:updated', updatedTask);
    return updatedTask;
  }

  async bulkUpdate(
    dto: BulkUpdateTasksDto,
    userId: string,
    userRole: string,
  ): Promise<BulkUpdateTasksResult> {
    const taskIds = Array.from(
      new Set(
        (dto.taskIds ?? [])
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    );

    if (taskIds.length === 0) {
      throw new BadRequestException('Select at least one task to update');
    }

    const updatePayload: Pick<UpdateTaskDto, 'status' | 'priority'> = {};

    if (dto.status !== undefined) {
      updatePayload.status = this.normalizeStatusValue(dto.status) as UpdateTaskDto['status'];
    }

    if (dto.priority !== undefined) {
      updatePayload.priority = this.normalizePriorityForWrite(dto.priority) as UpdateTaskDto['priority'];
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new BadRequestException('Choose a status or priority to update');
    }

    const updated: Task[] = [];

    for (const taskId of taskIds) {
      updated.push(await this.update(taskId, updatePayload, userId, userRole));
    }

    await this.broadcastTaskEvent('tasks:bulk-updated', {
      taskIds,
      updatedCount: updated.length,
    });

    return {
      updated,
      updatedCount: updated.length,
      requestedCount: taskIds.length,
    };
  }

  private async syncTaskAssignment(taskId: string, userId: string | null): Promise<void> {
    const { error: deletionError } = await this.client
      .from('task_assignments')
      .delete()
      .eq('task_id', taskId);
    if (deletionError) throw new BadRequestException(deletionError.message);

    if (!userId) {
      return;
    }

    const { error: insertionError } = await this.client
      .from('task_assignments')
      .insert({ task_id: taskId, user_id: userId });
    if (insertionError) throw new BadRequestException(insertionError.message);
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
      if (!task.project_id) {
        throw new BadRequestException('Task must have an associated project');
      }
      await this.assertProjectAdmin(task.project_id, userId);
    }

    const { error } = await this.client
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      throw new BadRequestException(error.message);
    }

    await this.broadcastTaskEvent('task:deleted', { id });
  }

  /**
   * Assign a task to a team member (or unassign by passing null)
   */
  async assignTask(
    id: string,
    assigneeId: string | null,
    userId: string,
    userRole: string,
  ): Promise<Task> {
    return this.update(
      id,
      { assignee_id: assigneeId, assigned_to: assigneeId },
      userId,
      userRole,
    );
  }

  private async attachTaskAssignees(tasks: Task[]): Promise<Task[]> {
    if (tasks.length === 0) return tasks;

    const taskIds = tasks.map((task) => task.id);
    const { data, error } = await this.client
      .from('task_assignments')
      .select('task_id, user_id')
      .in('task_id', taskIds);

    if (error) {
      throw new BadRequestException(error.message);
    }

    const assignmentByTask = (data ?? []).reduce<Record<string, string>>((map, row: any) => {
      if (row?.task_id && row?.user_id) {
        map[row.task_id] = row.user_id;
      }
      return map;
    }, {});

    return tasks.map((task) => ({
      ...task,
      assignee_id: task.assignee_id ?? assignmentByTask[task.id] ?? null,
      assigned_to: task.assigned_to ?? assignmentByTask[task.id] ?? null,
    }));
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
      const matchesStatus =
        status === 'all' || this.normalizeTaskStatusValue(task.status) === status;
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

  private normalizePriorityForWrite(priority: string): string {
    const normalized = priority.trim().toLowerCase();
    const priorityMap: Record<string, string> = {
      low: 'low',
      medium: 'medium',
      high: 'high',
    };

    const result = priorityMap[normalized];
    if (!result) {
      throw new BadRequestException(`Invalid task priority: ${priority}`);
    }

    return result;
  }

  private normalizeStatusValue(status: string): string {
    const normalized = status.trim().toLowerCase();
    const statusMap: Record<string, string> = {
      'to do': 'todo',
      todo: 'todo',
      to_do: 'todo',
      'in progress': 'in_progress',
      in_progress: 'in_progress',
      'in-progress': 'in_progress',
      'in review': 'In Review',
      in_review: 'In Review',
      review: 'In Review',
      done: 'Done',
      completed: 'Done',
    };

    const result = statusMap[normalized];
    if (!result) {
      throw new BadRequestException(`Invalid task status: ${status}`);
    }

    return result;
  }

  private normalizeTaskStatusValue(status?: string): TaskStatusFilter {
    const normalized = status?.trim().toLowerCase() ?? '';
    const statusMap: Record<string, TaskStatusFilter> = {
      'to do': 'To Do',
      'todo': 'To Do',
      'to_do': 'To Do',
      'in progress': 'In Progress',
      'in_progress': 'In Progress',
      'in-progress': 'In Progress',
      'in review': 'In Review',
      'in_review': 'In Review',
      'review': 'In Review',
      'done': 'Done',
      'completed': 'Done',
    };

    return statusMap[normalized] ?? 'To Do';
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
