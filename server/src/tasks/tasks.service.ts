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
  assigned_to?: string | null; // User ID to assign the task to on creation
}

export interface UpdateTaskDto {
  title?: string;
  description?: string | null;
  status?: 'To Do' | 'In Progress' | 'In Review' | 'Done';
  priority?: 'High' | 'Medium' | 'Low';
  due_date?: string | null;
  assigned_to?: string | null; // User ID to assign (or null to unassign)
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
      await channel.send({ type: 'broadcast', event, payload });
    } catch (error) {
      this.logger.warn(`Realtime broadcast failed for ${event}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async create(dto: CreateTaskDto, userId: string): Promise<Task> {
    if (dto.project_id) {
      await this.assertProjectMember(dto.project_id, userId);
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

    const { data, error } = await this.client
      .from('tasks')
      .insert({
        project_id: dto.project_id ?? null,
        title: dto.title,
        description: dto.description ?? null,
        status: convertStatus(dto.status ?? 'To Do'),
        priority: (dto.priority ?? 'Medium').toLowerCase(),
        due_date: dto.due_date ?? null,
        assigned_to: dto.assigned_to ?? null,
        created_by: userId,
      })
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    await this.broadcastTaskEvent('task:created', data);
    return data as Task;
  }

  async listForUser(userId: string, userRole: string): Promise<Task[]> {
    if (userRole === 'admin') {
      const { data, error } = await this.client
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new BadRequestException(error.message);
      return (data ?? []) as Task[];
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
    return (data ?? []) as Task[];
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

    await this.broadcastTaskEvent('task:updated', data);
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
  }
}
