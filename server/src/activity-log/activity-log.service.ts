/**
 * activity-log.service.ts
 *
 * Service layer for the Activity Log module.
 * Provides methods to:
 *  - Log new activity entries (used by other modules when events happen)
 *  - Query activity logs with filtering, pagination, and user enrichment
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  metadata: Record<string, unknown>;
  project_id: string | null;
  created_at: string;
  /** Joined from profiles table */
  profiles?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export interface CreateActivityLogDto {
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  metadata?: Record<string, unknown>;
  project_id?: string;
}

export interface ActivityLogQuery {
  /** Filter by project */
  project_id?: string;
  /** Filter by user */
  user_id?: string;
  /** Filter by entity type (task, project, member, comment) */
  entity_type?: string;
  /** Filter by action type */
  action?: string;
  /** Pagination: page number (1-based) */
  page?: number;
  /** Pagination: items per page (default 20, max 100) */
  limit?: number;
}

/* ------------------------------------------------------------------ */
/*  Predefined action types for consistency                            */
/* ------------------------------------------------------------------ */

export const ActivityActions = {
  // Task actions
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_DELETED: 'task_deleted',
  STATUS_CHANGED: 'status_changed',
  PRIORITY_CHANGED: 'priority_changed',
  ASSIGNED: 'assigned',
  UNASSIGNED: 'unassigned',

  // Project actions
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  PROJECT_DELETED: 'project_deleted',

  // Member actions
  MEMBER_ADDED: 'member_added',
  MEMBER_REMOVED: 'member_removed',
  ROLE_CHANGED: 'role_changed',

  // Comment actions
  COMMENT_ADDED: 'comment_added',
} as const;

@Injectable()
export class ActivityLogService {
  constructor(private readonly supabase: SupabaseService) {}

  /* ---------------------------------------------------------------- */
  /*  Write: log a new activity                                        */
  /* ---------------------------------------------------------------- */

  /**
   * Insert a new activity log entry.
   * Call this from other services whenever a trackable event occurs.
   */
  async log(dto: CreateActivityLogDto): Promise<ActivityLog> {
    const { data, error } = await this.supabase
      .getClient()
      .from('activity_logs')
      .insert({
        user_id: dto.user_id,
        action: dto.action,
        entity_type: dto.entity_type,
        entity_id: dto.entity_id,
        description: dto.description,
        metadata: dto.metadata ?? {},
        project_id: dto.project_id ?? null,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as ActivityLog;
  }

  /**
   * Convenience: log multiple entries at once (e.g. bulk assignment).
   */
  async logMany(entries: CreateActivityLogDto[]): Promise<void> {
    const rows = entries.map((dto) => ({
      user_id: dto.user_id,
      action: dto.action,
      entity_type: dto.entity_type,
      entity_id: dto.entity_id,
      description: dto.description,
      metadata: dto.metadata ?? {},
      project_id: dto.project_id ?? null,
    }));

    const { error } = await this.supabase
      .getClient()
      .from('activity_logs')
      .insert(rows);

    if (error) throw new BadRequestException(error.message);
  }

  /* ---------------------------------------------------------------- */
  /*  Read: query activity logs                                        */
  /* ---------------------------------------------------------------- */

  /**
   * List activity logs with optional filters and pagination.
   * Returns entries enriched with user profile info (name, avatar).
   */
  async list(
    query: ActivityLogQuery,
  ): Promise<{ data: ActivityLog[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let builder = this.supabase
      .getClient()
      .from('activity_logs')
      .select('*, profiles(full_name, email, avatar_url)', { count: 'exact' });

    // Apply filters
    if (query.project_id) {
      builder = builder.eq('project_id', query.project_id);
    }
    if (query.user_id) {
      builder = builder.eq('user_id', query.user_id);
    }
    if (query.entity_type) {
      builder = builder.eq('entity_type', query.entity_type);
    }
    if (query.action) {
      builder = builder.eq('action', query.action);
    }

    const { data, error, count } = await builder
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new BadRequestException(error.message);

    return {
      data: (data ?? []) as ActivityLog[],
      total: count ?? 0,
      page,
      limit,
    };
  }

  /**
   * Get recent activity across the whole workspace (for dashboard widget).
   * Returns the latest N entries with user info.
   */
  async getRecent(count: number = 10): Promise<ActivityLog[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('activity_logs')
      .select('*, profiles(full_name, email, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(count);

    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as ActivityLog[];
  }

  /**
   * Get activity for a specific entity (e.g. all changes to a task).
   */
  async getByEntity(entityType: string, entityId: string): Promise<ActivityLog[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('activity_logs')
      .select('*, profiles(full_name, email, avatar_url)')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as ActivityLog[];
  }
}
