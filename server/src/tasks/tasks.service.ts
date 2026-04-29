import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase';
import {
  type Paginated,
  type PaginationParams,
  parsePagination,
} from '../common/pagination';

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
      await channel.httpSend(event, payload);
    } catch (error) {
      this.logger.warn(`Realtime broadcast failed for ${event}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async create(dto: CreateTaskDto, userId: string): Promise<Task> {
    if (dto.project_id) {
      await this.assertProjectMember(dto.project_id, userId);
      if (dto.assignee_id) {
        await this.assertProjectMember(dto.project_id, dto.assignee_id);
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
      assigned_to: dto.assigned_to ?? null,
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

    if (dto.assignee_id) {
      const { error: assignmentError } = await this.client
        .from('task_assignments')
        .insert({
          task_id: task.id,
          user_id: dto.assignee_id,
        });

      if (assignmentError) {
        throw new BadRequestException(assignmentError.message);
      }
      task.assignee_id = dto.assignee_id;
    }

    await this.broadcastTaskEvent('task:created', task);
    return task;
  }

  async listForUser(
    userId: string,
    userRole: string,
    rawPage?: string | number,
    rawLimit?: string | number,
  ): Promise<Paginated<Task>> {
    const pagination = parsePagination(rawPage, rawLimit);
    let tasks: Task[] = [];
    let total = 0;

    if (userRole === 'admin') {
      ({ tasks, total } = await this.fetchTasks((q) => q, pagination));
    } else {
      const { data: memberships, error: mError } = await this.client
        .from('project_members')
        .select('project_id')
        .eq('user_id', userId);

      if (mError) throw new BadRequestException(mError.message);

      const projectIds = (memberships ?? []).map((m: any) => m.project_id);

      ({ tasks, total } = await this.fetchTasks((q) => {
        if (projectIds.length > 0) {
          return q.in('project_id', projectIds);
        }
        return q.is('project_id', null);
      }, pagination));
    }

    const data = await this.attachTaskAssignees(tasks);
    return { data, total, page: pagination.page, limit: pagination.limit };
  }

  async listByProject(
    projectId: string,
    userId: string,
    userRole: string,
    rawPage?: string | number,
    rawLimit?: string | number,
  ): Promise<Paginated<Task>> {
    if (userRole !== 'admin') {
      await this.assertProjectMember(projectId, userId);
    }

    const pagination = parsePagination(rawPage, rawLimit);
    const { tasks, total } = await this.fetchTasks(
      (q) => q.eq('project_id', projectId),
      pagination,
    );
    const data = await this.attachTaskAssignees(tasks);
    return { data, total, page: pagination.page, limit: pagination.limit };
  }

  /**
   * Shared helper that applies the standard ordering, range, and
   * count-exact selection to a tasks query. The `apply` callback lets
   * callers add their own filters (project_id, in clause, etc.)
   * without duplicating the boilerplate.
   */
  private async fetchTasks(
    apply: (q: ReturnType<typeof this.client.from> extends infer _ ? any : never) => any,
    pagination: PaginationParams,
  ): Promise<{ tasks: Task[]; total: number }> {
    const base = this.client
      .from('tasks')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(pagination.from, pagination.to);

    const { data, error, count } = await apply(base);
    if (error) throw new BadRequestException(error.message);
    return { tasks: (data ?? []) as Task[], total: count ?? 0 };
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
    }));
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

    const assignmentUserId = dto.assignee_id;
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
    }

    await this.broadcastTaskEvent('task:updated', updatedTask);
    return updatedTask;
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
    return this.update(id, { assigned_to: assigneeId }, userId, userRole);
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
  }}
