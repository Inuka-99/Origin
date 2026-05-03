import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase';
import { TasksService } from '../tasks/tasks.service';

interface TimeEntryRow {
  id: string;
  task_id: string;
  user_id: string;
  duration_minutes: number;
  description: string | null;
  logged_at: string;
  created_at: string;
}

interface TimeEntryProfile {
  id: string;
  full_name: string | null;
  email: string | null;
}

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  duration_minutes: number;
  description: string | null;
  logged_at: string;
  created_at: string;
  user?: TimeEntryProfile;
}

export interface CreateTimeEntryDto {
  duration_minutes: number;
  logged_at?: string;
  description?: string | null;
}

export interface UpdateTimeEntryDto {
  duration_minutes: number;
  logged_at?: string;
  description?: string | null;
}

@Injectable()
export class TimeEntriesService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly tasksService: TasksService,
  ) {}

  private get client() {
    return this.supabase.getClient();
  }

  async listForTask(taskId: string, userId: string, userRole: string): Promise<TimeEntry[]> {
    await this.tasksService.getById(taskId, userId, userRole);

    const { data, error } = await this.client
      .from('time_entries')
      .select('*')
      .eq('task_id', taskId)
      .order('logged_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return this.attachProfiles((data ?? []) as TimeEntryRow[]);
  }

  async createForTask(
    taskId: string,
    dto: CreateTimeEntryDto,
    userId: string,
    userRole: string,
  ): Promise<TimeEntry> {
    await this.tasksService.getById(taskId, userId, userRole);

    const durationMinutes = Number(dto.duration_minutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      throw new BadRequestException('duration_minutes must be greater than 0');
    }

    const normalizedDuration = Math.round(durationMinutes);
    const loggedAt = dto.logged_at?.trim() ? dto.logged_at.trim() : new Date().toISOString();
    if (Number.isNaN(new Date(loggedAt).getTime())) {
      throw new BadRequestException('logged_at must be a valid date/time');
    }

    const { data, error } = await this.client
      .from('time_entries')
      .insert({
        task_id: taskId,
        user_id: userId,
        duration_minutes: normalizedDuration,
        description: dto.description?.trim() || null,
        logged_at: loggedAt,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Unable to create time entry');
    }

    const [entry] = await this.attachProfiles([data as TimeEntryRow]);
    return entry;
  }

  async updateForTask(
    taskId: string,
    entryId: string,
    dto: UpdateTimeEntryDto,
    userId: string,
    userRole: string,
  ): Promise<TimeEntry> {
    await this.tasksService.getById(taskId, userId, userRole);

    const { data: existing, error: existingError } = await this.client
      .from('time_entries')
      .select('*')
      .eq('id', entryId)
      .eq('task_id', taskId)
      .single();

    if (existingError || !existing) {
      throw new NotFoundException('Time entry not found');
    }

    const current = existing as TimeEntryRow;
    if (userRole !== 'admin' && current.user_id !== userId) {
      throw new ForbiddenException('You can only edit your own time entries');
    }

    const durationMinutes = Number(dto.duration_minutes);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      throw new BadRequestException('duration_minutes must be greater than 0');
    }

    const normalizedDuration = Math.round(durationMinutes);
    const loggedAt = dto.logged_at?.trim() ? dto.logged_at.trim() : current.logged_at;
    if (Number.isNaN(new Date(loggedAt).getTime())) {
      throw new BadRequestException('logged_at must be a valid date/time');
    }

    const { data, error } = await this.client
      .from('time_entries')
      .update({
        duration_minutes: normalizedDuration,
        logged_at: loggedAt,
        description: dto.description?.trim() || null,
      })
      .eq('id', entryId)
      .eq('task_id', taskId)
      .select('*')
      .single();

    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Unable to update time entry');
    }

    const [entry] = await this.attachProfiles([data as TimeEntryRow]);
    return entry;
  }

  private async attachProfiles(rows: TimeEntryRow[]): Promise<TimeEntry[]> {
    if (rows.length === 0) {
      return [];
    }

    const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
    const { data, error } = await this.client
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);

    if (error) {
      throw new BadRequestException(error.message);
    }

    const profileMap = new Map<string, TimeEntryProfile>();
    for (const row of (data ?? []) as TimeEntryProfile[]) {
      profileMap.set(row.id, row);
    }

    return rows.map((row) => ({
      ...row,
      user: profileMap.get(row.user_id),
    }));
  }
}
